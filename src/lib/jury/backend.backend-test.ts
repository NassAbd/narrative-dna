// @vitest-environment node
import { it, expect, vi } from "vitest";
import { handleWithDependencies, handleJuryRequest } from "./backend.server";
import { digest, equalDigest, sessionCookie, checkMutation, randomToken, hmac } from "./auth.server";
import { boundVideos, limitedJson, providerStatus, runPipeline, safeFrame, searchBody, SEARCH_URL } from "./pipeline.server";
import { checkClaim, passagesFor } from "./grounding";
import type { NormalizedVideo } from "./source-types";
import { JuryError } from "./storage.server";
const secrets = { JURY_LIVE_ENABLED: "true", JURY_ACCESS_PASSWORD: "synthetic-test-password", SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key", SUPABASE_URL: "https://database.invalid", ORIANE_API_KEY: "synthetic", OPENAI_API_KEY: "synthetic" };
const origin = "https://narrative-evidence-atlas.lovable.app";
const request = (path: string, body?: unknown, extra: Record<string, string> = {}) => new Request(`${origin}/api/jury/${path}`, { method: body === undefined ? "GET" : "POST", headers: { origin, "content-type": "application/json", ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const video: NormalizedVideo = { source: { orianeId: "v1", platform: "tiktok", platformId: null, creator: null, publishedAt: null, url: null }, transcript: "Je cherche un logement étudiant.", transcriptChunks: [], onScreenText: [], frames: [] };
it("defaults to disabled and never contacts storage or providers", async () => {
  const rpc = vi.fn(), fetcher = vi.fn();
  expect(await (await handleWithDependencies(request("config"), {}, { rpc, fetcher })).json()).toEqual({ available: false });
  expect(rpc).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
});
it("rejects cross-origin mutations before login reservation", async () => {
  const rpc = vi.fn(async () => ({ healthy: true }));
  const response = await handleWithDependencies(request("login", { password: "wrong" }, { origin: "https://evil.invalid" }), secrets, { rpc });
  expect(response.status).toBe(403); expect(rpc.mock.calls).toHaveLength(1);
  expect(() => checkMutation(new Request(origin, { method: "POST", headers: { origin, "content-type": "text/plain" } }))).toThrow();
});
it("rate-limits before comparing the password and reports a generic incorrect-password error", async () => {
  const actions: string[] = [];
  const rpc = vi.fn(async (action: string) => { actions.push(action); return { healthy: true }; });
  const response = await handleWithDependencies(request("login", { password: "wrong" }), secrets, { rpc });
  expect(await response.json()).toEqual({ errorCode: "incorrect_password" });
  expect(actions).toEqual(["health", "login_limit"]);
  const limited = await handleWithDependencies(request("login", { password: "wrong" }), secrets, { rpc: async a => { if (a === "login_limit") throw new JuryError("login_limited", 429); return { healthy: true }; } });
  expect(limited.status).toBe(429);
});
it("issues the required 45-minute strict cookie and stores only hashes", async () => {
  const rpc = vi.fn(async () => ({ healthy: true, authenticated: true, remaining: 10 }));
  const response = await handleWithDependencies(request("login", { password: secrets.JURY_ACCESS_PASSWORD }), secrets, { rpc });
  const cookie = response.headers.get("set-cookie") ?? "";
  expect(cookie).toMatch(/^__Host-nd-jury=[a-f0-9]{64}; HttpOnly; Secure; SameSite=Strict; Path=\/; Max-Age=2700$/);
  const login = rpc.mock.calls as unknown as [string, Record<string, unknown>][];
  const args = login.find(c => c[0] === "login")?.[1];
  expect(args?.["token_hash"]).not.toBe(cookie.split(";")[0]?.split("=")[1]);
  expect(cookie).not.toContain(secrets.JURY_ACCESS_PASSWORD);
  expect(sessionCookie("", true)).toContain("Max-Age=0");
});
it("rotation changes credential versions and digest comparison is fixed-length", async () => {
  expect(await hmac("test", "password-one")).not.toBe(await hmac("test", "password-two"));
  const value = await digest("test"); expect(equalDigest(value, value)).toBe(true); expect(equalDigest(value, await digest("other"))).toBe(false);
});
it("requires CSRF for authenticated mutations and clears expired session cookies", async () => {
  const token = randomToken();
  const response = await handleWithDependencies(request("logout", {}, { cookie: `__Host-nd-jury=${token}` }), secrets, { rpc: async () => ({ healthy: true }) });
  expect(response.status).toBe(403);
  const expired = await handleWithDependencies(request("session", undefined, { cookie: `__Host-nd-jury=${token}` }), secrets, { rpc: async action => { if (action === "session") throw new JuryError("unauthenticated", 401); return { healthy: true }; } });
  expect(await expired.json()).toEqual({ available: true, authenticated: false }); expect(expired.headers.get("set-cookie")).toContain("Max-Age=0");
});
it("preflight invalid queries reserve nothing and database failure prevents paid calls", async () => {
  const token = randomToken(), csrf = await hmac(secrets.SUPABASE_SERVICE_ROLE_KEY, `jury-csrf:${token}`);
  const headers = { cookie: `__Host-nd-jury=${token}`, "x-csrf-token": csrf };
  const rpc = vi.fn(async () => ({ healthy: true })), fetcher = vi.fn();
  const bad = await handleWithDependencies(request("jobs", { query: { topic: "x", platforms: ["tiktok"], language: "fr", dateRange: null }, idempotencyKey: crypto.randomUUID() }, headers), secrets, { rpc, fetcher });
  expect(bad.status).toBe(400); expect(rpc).toHaveBeenCalledTimes(1);
  const failed = await handleWithDependencies(request(`jobs/${crypto.randomUUID()}/run`, {}, headers), secrets, { rpc: async () => { throw new JuryError("storage_unavailable", 503); }, fetcher });
  expect(failed.status).toBe(503); expect(fetcher).not.toHaveBeenCalled();
});
it("search uses an arbitrary topic and the exact one-request endpoint", () => {
  expect(SEARCH_URL).toBe("https://connect.oriane.xyz/rest/contents/search?limit=10&offset=0&projection=full&sort=transcriptRelevance:desc");
  expect(searchBody("Intelligence artificielle en France").filters.transcript.includesFuzzy.values).toContain("Intelligence");
});
it.each([400, 401, 403, 402, 429, 500])("handles provider HTTP %i without exposing response content", status => {
  expect(() => providerStatus(status, "oriane")).toThrow(JuryError);
});
it("allows Oriane partial data but rejects oversized and malformed responses", async () => {
  expect(() => providerStatus(206, "oriane")).not.toThrow();
  await expect(limitedJson(new Response("not json"))).rejects.toThrow("provider_incomplete");
  await expect(limitedJson(new Response("12345"), 4)).rejects.toThrow("provider_response_limit");
});
it("bounds transcript inputs without inventing timestamps and rejects unsupported semantics", () => {
  const warnings: string[] = [];
  const bounded = boundVideos(Array.from({ length: 10 }, (_, i) => ({ ...video, source: { ...video.source, orianeId: `${i}` }, transcript: "x".repeat(9000) })), warnings);
  expect(bounded.every(v => (v.transcript?.length ?? 0) <= 6000)).toBe(true);
  expect(bounded.reduce((n, v) => n + (v.transcript?.length ?? 0), 0)).toBe(40000);
  expect(passagesFor(bounded[0] ?? video)[0]?.startSeconds).toBe(null);
  const p = passagesFor(video)[0]; if (!p) throw new Error("missing fixture");
  expect(checkClaim({ ...p, videoId: "v1", formulation: "Il est victime de discrimination", type: "argument" }, [video]).status).toBe("rejected");
  expect(checkClaim({ ...p, videoId: "fabricated", formulation: "cherche", type: "question" }, [video]).status).toBe("rejected");
});
it("only returns unsigned catalog frames with actual timestamps", () => {
  const withFrames = { ...video, frames: [{ id: null, url: "https://evil.invalid/image.jpg", timestampSeconds: 2, onScreenText: [] }, { id: null, url: "https://social-catalog-static.oriane.xyz/frame.jpg", timestampSeconds: 9, onScreenText: [] }] };
  expect(safeFrame(withFrames, 1, 3)).toEqual({ frameUrl: "https://social-catalog-static.oriane.xyz/frame.jpg", frameTimestampSec: 9, frameOutsideInterval: true });
  expect(safeFrame(withFrames, null, null)).toEqual({});
});
it("runs mocked real extraction stages with locally bound evidence and no human approval", async () => {
  const stages: string[] = [], calls: string[] = [];
  const fetcher: typeof fetch = async input => {
    calls.push(String(input));
    if (String(input) === SEARCH_URL) return Response.json({ data: { results: [{ id: "v1", platform: "tiktok", media: [{ transcript: video.transcript }] }] }, metadata: { pagination: { offset: 0, limit: 10, totalCount: 1 } } });
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ videos: [{ videoId: "v1", relevance: "relevant", genre: "non-fiction", speakerConfidence: "high", relevanceReason: "topic matched", claims: [{ passageId: "v1:0", formulation: "La personne cherche un logement étudiant", type: "question" }] }] }) } }], usage: { prompt_tokens: 100, completion_tokens: 100 } });
  };
  const result = await runPipeline({ topic: "Logement étudiant", platforms: ["tiktok"], language: "fr", dateRange: null }, secrets, { fetcher, signal: AbortSignal.timeout(3000), stage: async s => { stages.push(s); } });
  expect(stages).toEqual(["retrieve", "extract", "group", "verify", "ready"]);
  expect(calls).toHaveLength(2); expect(result.individualObservations[0]?.quote).toBe(video.transcript);
  expect(result.individualObservations[0]?.editorialReview).toBe("required");
  expect(result.counts.videosContributingEvidence).toBe(1); expect(result.metrics.confirmedOrianeCredits).toBe(null);
});
it("production entry remains unavailable with no runtime bindings", async () => {
  expect(await (await handleJuryRequest(request("config"), { JURY_LIVE_ENABLED: "false" })).json()).toEqual({ available: false });
});
it("awaits a reserved authenticated runner, reads its persisted result, and does not retry failures", async () => {
  const token = randomToken(), csrf = await hmac(secrets.SUPABASE_SERVICE_ROLE_KEY, `jury-csrf:${token}`), id = crypto.randomUUID();
  const headers = { cookie: `__Host-nd-jury=${token}`, "x-csrf-token": csrf };
  let saved: Record<string, unknown> = { id, status: "queued", stage: "search", completedStages: [], remaining: 9, cached: false };
  const query = { topic: "Logement étudiant", platforms: ["tiktok"], language: "fr", dateRange: null };
  const actions: string[] = [];
  const rpc = async (action: string, args: Record<string, unknown> = {}) => {
    actions.push(action);
    if (action === "health") return { healthy: true };
    if (action === "claim") { saved["status"] = "running"; return { ...saved, query, runToken: crypto.randomUUID() }; }
    if (action === "stage") { saved["stage"] = args["stage"]; return saved; }
    if (action === "finish") { saved = { ...saved, status: args["outcome"], result: args["result"], errorCode: args["error_code"] }; return saved; }
    return saved;
  };
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: { results: [] } }));
  const response = await handleWithDependencies(request(`jobs/${id}/run`, {}, headers), secrets, { rpc, fetcher });
  expect((await response.json()).status).toBe("failed");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(actions.filter(a => a === "finish")).toHaveLength(1);
  const readBack = await handleWithDependencies(request(`jobs/${id}`, undefined, headers), secrets, { rpc });
  expect((await readBack.json()).errorCode).toBe("no_results");
});