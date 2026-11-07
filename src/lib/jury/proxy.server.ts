import { assertSameOrigin } from "./contracts";
const targets = import.meta.glob("./backend-target.json", {
  eager: true,
  import: "default",
}) as Record<string, { url?: string; functionUrl?: string }>;
const error = (status: number, code: string) =>
  new Response(JSON.stringify({ errorCode: code }), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
export async function proxyJuryRequest(
  request: Request,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const path = new URL(request.url).pathname.slice("/api/jury".length);
  if (!/^\/(config|session|login|logout|jobs(?:\/[0-9a-f-]{36}(?:\/(?:run|cancel))?)?)$/.test(path))
    return error(404, "not_found");
  if (!["GET", "POST"].includes(request.method)) return error(405, "method_not_allowed");
  try {
    assertSameOrigin(request);
  } catch {
    return error(403, "csrf_rejected");
  }
  const config = Object.values(targets)[0];
  const target = config?.url ?? config?.functionUrl;
  if (!target)
    return path === "/session" || path === "/config"
      ? Response.json(
          { available: false, authenticated: false },
          { headers: { "cache-control": "no-store" } },
        )
      : error(503, "live_unavailable");
  let url: URL;
  try {
    url = new URL(target);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".supabase.co") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw Error();
  } catch {
    return error(503, "live_unavailable");
  }
  const headers = new Headers({ accept: "application/json" });
  for (const key of [
    "content-type",
    "cookie",
    "origin",
    "x-csrf-token",
    "x-jury-request",
    "idempotency-key",
  ]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("origin", new URL(request.url).origin);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) headers.set("x-jury-client-ip", ip);
  try {
    let body: string | undefined;
    if (request.method === "POST") {
      if (Number(request.headers.get("content-length") ?? 0) > 2048)
        return error(413, "invalid_request");
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader)
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 2048) {
            await reader.cancel();
            return error(413, "invalid_request");
          }
          chunks.push(value);
        }
      const merged = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      body = new TextDecoder().decode(merged);
    }
    const response = await fetcher(target.replace(/\/$/, "") + path, {
      method: request.method,
      headers,
      ...(body !== undefined ? { body } : {}),
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(65_000)]),
    });
    const outgoing = new Headers({
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    const cookie = response.headers.get("set-cookie");
    if (cookie) outgoing.set("set-cookie", cookie);
    const retry = response.headers.get("retry-after");
    if (retry) outgoing.set("retry-after", retry);
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return error(503, "live_unavailable");
  }
}
