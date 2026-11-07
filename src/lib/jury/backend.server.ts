import { z } from "zod";
import { isEnabled, LoginSchema, SubmitSchema, JobIdSchema, cacheIdentity, normalizeQuery } from "./contracts";
import { checkMutation, digest, equalDigest, hmac, jsonBody, randomToken, readToken, sessionCookie } from "./auth.server";
import { bindings, JuryError, storage, type Rpc, type JuryBindings } from "./storage.server";
import { runPipeline, searchBody } from "./pipeline.server";

const emptyBody = z.object({}).strict();
const reply = (data: unknown, status = 200, cookie?: string) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff", ...(cookie ? { "set-cookie": cookie } : {}) } });
export interface BackendDependencies { rpc?: Rpc; fetcher?: typeof fetch }
/** Raw HTTP entry point; the owner wires this into src/server.ts and awaits it. */
export async function handleJuryRequest(request: Request, env: unknown): Promise<Response> {
  return handleWithDependencies(request, bindings(env));
}
/** Dependency injection is server-only and used by unpaid integration tests. */
export async function handleWithDependencies(request: Request, secrets: JuryBindings, dependencies: BackendDependencies = {}): Promise<Response> {
  const rpc = dependencies.rpc ?? storage(secrets), path = new URL(request.url).pathname;
  let available = false;
  try {
    if (isEnabled(secrets) && secrets["SUPABASE_URL"] && secrets["SUPABASE_SERVICE_ROLE_KEY"]) available = Boolean((await rpc("health"))["healthy"]);
    if (path === "/api/jury/config" && request.method === "GET") return reply({ available });
    if (!available) {
      if (path === "/api/jury/session" && request.method === "GET") return reply({ available: false, authenticated: false });
      throw new JuryError("unavailable", 503);
    }
    const key = secrets["SUPABASE_SERVICE_ROLE_KEY"];
    const password = secrets["JURY_ACCESS_PASSWORD"];
    if (!key || !password) throw new JuryError("unavailable", 503);
    const version = await hmac(key, `jury-credential:${password}`);
    if (request.method === "POST") checkMutation(request);
    if (path === "/api/jury/login" && request.method === "POST") {
      // JSON is the required non-simple header; exact Origin is independently checked.
      await rpc("login_limit");
      const input = LoginSchema.parse(await jsonBody(request));
      if (!equalDigest(await hmac(key, `jury-password:${input.password}`), await hmac(key, `jury-password:${password}`))) throw new JuryError("incorrect_password", 401);
      const token = randomToken(), csrf = await hmac(key, `jury-csrf:${token}`);
      const state = await rpc("login", { token_hash: await digest(token), credential_version: version, csrf_hash: await digest(csrf) });
      return reply({ available: true, ...state, csrfToken: csrf }, 200, sessionCookie(token));
    }
    const token = readToken(request);
    if (!token) {
      if (path === "/api/jury/session" && request.method === "GET") return reply({ available: true, authenticated: false });
      throw new JuryError("unauthenticated", 401);
    }
    const csrf = await hmac(key, `jury-csrf:${token}`);
    const auth = { token_hash: await digest(token), credential_version: version, csrf_hash: await digest(csrf) };
    if (request.method === "POST" && !equalDigest(await digest(request.headers.get("x-csrf-token") ?? ""), auth.csrf_hash)) throw new JuryError("csrf_rejected", 403);
    if (path === "/api/jury/session" && request.method === "GET") {
      try { return reply({ available: true, ...await rpc("session", auth), csrfToken: csrf }); }
      catch (error) { if (error instanceof JuryError && error.code === "unauthenticated") return reply({ available: true, authenticated: false }, 200, sessionCookie("", true)); throw error; }
    }
    if (path === "/api/jury/logout" && request.method === "POST") {
      emptyBody.parse(await jsonBody(request)); await rpc("logout", auth);
      return reply({ available: true, authenticated: false }, 200, sessionCookie("", true));
    }
    if (path === "/api/jury/jobs" && request.method === "POST") {
      const body = SubmitSchema.parse(await jsonBody(request));
      const forwardedId = request.headers.get("idempotency-key");
      if (forwardedId && forwardedId !== body.idempotencyKey) throw new JuryError("idempotency_conflict", 409);
      const query = normalizeQuery(body.query);
      searchBody(query.topic); // Preflight before reservation.
      const job = await rpc("reserve", { ...auth, query, idempotency_key: body.idempotencyKey, cache_key: await digest(cacheIdentity(query)) });
      return reply(publicJob(job));
    }
    const match = path.match(/^\/api\/jury\/jobs\/([^/]+)(?:\/(run|cancel))?$/);
    if (!match) throw new JuryError("not_found", 404);
    const id = JobIdSchema.parse(match[1]), operation = match[2];
    const jobAuth = { ...auth, job_id: id };
    if (!operation && request.method === "GET") return reply(publicJob(await rpc("get", jobAuth)));
    if (request.method !== "POST") throw new JuryError("method_not_allowed", 405);
    emptyBody.parse(await jsonBody(request));
    if (operation === "cancel") return reply(publicJob(await rpc("cancel", jobAuth)));
    if (operation !== "run") throw new JuryError("not_found", 404);
    // One atomic claim only; never retry a provider on refresh, disconnect or repeated run.
    const claim = await rpc("claim", jobAuth);
    const runAuth = { ...jobAuth, run_token: claim["runToken"] };
    // Leave 5 seconds for durable completion; admission lock lives 120 seconds.
    const signal = AbortSignal.timeout(49_000);
    try {
      const query = SubmitSchema.shape.query.parse(claim["query"]);
      const result = await runPipeline(query, secrets, { ...(dependencies.fetcher ? { fetcher: dependencies.fetcher } : {}), signal, stage: async stage => {
        if (!isEnabled(secrets)) throw new JuryError("unavailable", 503);
        signal.throwIfAborted(); await rpc("stage", { ...runAuth, stage });
      } });
      return reply(publicJob(await rpc("finish", { ...runAuth, outcome: "completed", result })));
    } catch (error) {
      const code = error instanceof JuryError ? error.code : signal.aborted ? "execution_timeout" : "analysis_failed";
      // An abort must settle the awaited fetch first. Only then can finish release the lease.
      // Storage failure leaves the lease and quota untouched; a later RPC expires it.
      const failed = await rpc("finish", { ...runAuth, outcome: code === "cancelled" ? "cancelled" : "failed", error_code: code });
      return reply(publicJob(failed));
    }
  } catch (error) {
    if (error instanceof z.ZodError) return reply({ errorCode: "invalid_request" }, 400);
    if (error instanceof JuryError) return reply({ errorCode: error.code }, error.status);
    // Never expose diagnostics, provider bodies, or secret-derived values.
    return reply({ errorCode: "unavailable" }, 503);
  }
}
function publicJob(job: Record<string, any>) {
  const { runToken: _run, query: _query, ...safe } = job;
  if (safe["result"] && safe["cached"]) safe["result"] = { ...safe["result"], cached: true };
  return safe;
}