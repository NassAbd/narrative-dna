import { JuryError } from "./storage.server";
export const ORIGINS = new Set([
  "https://narrative-evidence-atlas.lovable.app",
  "https://id-preview--41cd812c-07d9-4135-a56e-46e9f7e157f0.lovable.app",
]);
export const COOKIE = "__Host-nd-jury";
const encoder = new TextEncoder();
export async function digest(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function hmac(key: string, value: string): Promise<string> {
  const imported = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", imported, encoder.encode(value)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
export function equalDigest(a: string, b: string): boolean {
  // Inputs must both be SHA-256 digests. Fixed loop, no secret-dependent early exit.
  let difference = a.length ^ b.length;
  for (let i = 0; i < 64; i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
export function randomToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function sessionCookie(token: string, revoke = false): string {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${revoke ? 0 : 2700}`;
}
export function readToken(request: Request): string | null {
  const tokens = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.startsWith(`${COOKIE}=`));
  const token = tokens[0]?.slice(COOKIE.length + 1);
  return tokens.length === 1 && token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export function checkMutation(request: Request): void {
  if (
    !ORIGINS.has(request.headers.get("origin") ?? "") ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    !/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")
  )
    throw new JuryError("csrf_rejected", 403);
}
export async function jsonBody(request: Request): Promise<unknown> {
  // Streaming bound works even when Content-Length is absent or dishonest.
  const reader = request.body?.getReader();
  if (!reader) throw new JuryError("invalid_request");
  let bytes = 0,
    value = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 8192) {
        await reader.cancel();
        throw new JuryError("invalid_request", 413);
      }
      value += decoder.decode(chunk.value, { stream: true });
    }
    value += decoder.decode();
    return JSON.parse(value);
  } catch (error) {
    if (error instanceof JuryError) throw error;
    throw new JuryError("invalid_request");
  } finally {
    reader.releaseLock();
  }
}
