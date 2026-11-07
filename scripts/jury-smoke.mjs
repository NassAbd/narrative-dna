// One bounded paid analysis; credentials are read only from process.env.
// Run with Node's --env-file pointing to your ignored local test environment.
import { writeFile } from "node:fs/promises";
const base = process.env.JURY_BASE_URL ?? "https://narrative-evidence-atlas.lovable.app";
const allowed = [
  "https://narrative-evidence-atlas.lovable.app",
  "https://id-preview--41cd812c-07d9-4135-a56e-46e9f7e157f0.lovable.app",
];
if (!allowed.includes(base)) throw new Error("Unsupported smoke-test destination");
const password = process.env.JURY_ACCESS_PASSWORD;
if (!password || password.length < 16)
  throw new Error(
    "Missing local JURY_ACCESS_PASSWORD (at least 16 characters); never paste it into chat",
  );
let cookie = "",
  csrf = "";
const operations = [];
async function request(path, body, headers = {}) {
  const started = performance.now();
  const response = await fetch(base + "/api/jury" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin: base,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
      ...(csrf ? { "x-csrf-token": csrf } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(65000),
    redirect: "error",
  });
  operations.push({
    path,
    status: response.status,
    latencyMs: Math.round(performance.now() - started),
  });
  const value = await response.json();
  return { response, value };
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
try {
  const preflight = await request("/session");
  const processingVersion = preflight.response.headers.get("x-narrative-version");
  assert(
    processingVersion === "jury-v6-gpt4o-mini-2026-11-07",
    "Corrected backend version is not deployed; no paid analysis attempted",
  );
  assert(
    preflight.value.available === true,
    "Live is not enabled or production bindings are unavailable",
  );
  assert(preflight.value.authenticated === false, "Expected anonymous smoke session");
  const protectedRead = await request("/jobs/" + crypto.randomUUID());
  assert(protectedRead.response.status === 401, "Anonymous job read must be denied");
  const login = await request("/login", { password });
  assert(login.response.ok && login.value.authenticated === true, "Server authentication failed");
  const setCookie = login.response.headers.get("set-cookie") ?? "";
  assert(
    /HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie) && /SameSite=Strict/i.test(setCookie),
    "Session cookie attributes failed",
  );
  cookie = setCookie.split(";")[0];
  csrf = login.value.csrfToken;
  assert(
    typeof csrf === "string" && typeof login.value.remaining === "number",
    "Invalid session contract",
  );
  const deniedCsrf = await request("/logout", {}, { "x-csrf-token": "" });
  assert(deniedCsrf.response.status === 403, "Missing CSRF must be rejected");
  const before = login.value.remaining;
  const query = {
    topic: process.env.JURY_SMOKE_TOPIC ?? "Intelligence artificielle et emploi en France",
    platforms: ["tiktok"],
    language: "fr",
    dateRange: null,
  };
  const key = crypto.randomUUID();
  const start = performance.now();
  const reserved = await request("/jobs", { query, idempotencyKey: key });
  assert(
    reserved.response.ok,
    "Reservation failed: " + String(reserved.value.errorCode ?? "unknown"),
  );
  const jobId = reserved.value.id;
  assert(typeof jobId === "string" && /^[0-9a-f-]{36}$/.test(jobId), "Invalid job identity");
  const duplicate = await request("/jobs", { query, idempotencyKey: key });
  assert(
    duplicate.value.id === jobId && duplicate.value.remaining === reserved.value.remaining,
    "Idempotency failed",
  );
  const finished =
    reserved.value.status === "completed" ? reserved : await request("/jobs/" + jobId + "/run", {});
  assert(
    finished.response.ok && finished.value.status === "completed",
    "Analysis failed: " + String(finished.value.errorCode ?? "unknown"),
  );
  const result = finished.value.result;
  assert(result?.mode === "live", "Wrong result provenance");
  const clips = [...result.narratives.flatMap((n) => n.evidence), ...result.individualObservations];
  assert(clips.length > 0, "No source-grounded claims");
  for (const c of clips) {
    assert(
      c.provenance === "live" && c.transcriptContext.includes(c.quote),
      "Quote/context validation failed",
    );
    assert(
      (c.startSec === null && c.endSec === null) ||
        (Number.isFinite(c.startSec) &&
          Number.isFinite(c.endSec) &&
          c.startSec >= 0 &&
          c.endSec >= c.startSec),
      "Invalid citation timing",
    );
    assert(c.editorialReview !== "accepted", "Live evidence must not be human-approved");
  }
  const cached = await request("/jobs", { query, idempotencyKey: crypto.randomUUID() });
  assert(
    cached.response.ok &&
      cached.value.cached === true &&
      cached.value.remaining === finished.value.remaining,
    "Free cache failed",
  );
  const endToEndMs = Math.round(performance.now() - start);
  const logout = await request("/logout", {});
  assert(logout.response.ok, "Logout failed");
  const revoked = await request("/session");
  assert(revoked.value.authenticated === false, "Session revocation failed");
  const report = {
    processingVersion,
    topic: query.topic,
    operations,
    remainingBefore: before,
    remainingAfter: finished.value.remaining,
    newAnalyses: reserved.value.cached ? 0 : 1,
    cachedVerified: true,
    quoteChecks: clips.length,
    counts: result.counts,
    metrics: result.metrics,
    endToEndMs,
    narratives: result.narratives.length,
    claims: clips.length,
    withFrames: clips.filter((c) => c.frameUrl).length,
    example: {
      videoId: clips[0].videoId,
      quote: clips[0].quote,
      formulation: clips[0].formulation,
      startSec: clips[0].startSec,
      endSec: clips[0].endSec,
    },
    editorialReview: "required",
  };
  await writeFile("/private/tmp/narrative-dna-live-smoke.json", JSON.stringify(report, null, 2), {
    mode: 0o600,
  });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const report = {
    failed: true,
    errorCategory:
      error instanceof Error && error.message.startsWith("Analysis failed:")
        ? error.message
        : "smoke_check_failed",
    operations,
  };
  await writeFile(
    "/private/tmp/narrative-dna-live-smoke-failure.json",
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
  console.log(JSON.stringify(report, null, 2));
  if (cookie && csrf)
    try {
      await request("/logout", {});
    } catch {
      /* Keep failures sanitized. */
    }
  process.exitCode = 1;
}
