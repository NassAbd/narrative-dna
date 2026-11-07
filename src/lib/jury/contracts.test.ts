import { expect, it } from "vitest";
import {
  assertSameOrigin,
  cacheIdentity,
  isEnabled,
  LiveQuerySchema,
  SubmitSchema,
  LIVE_LIMITS,
} from "./contracts";
const query = {
  topic: "Intelligence artificielle",
  platforms: ["tiktok"] as ["tiktok"],
  language: "fr" as const,
  dateRange: null,
};
it("bounds arbitrary topics and rejects unsupported controls", () => {
  expect(LiveQuerySchema.parse(query).topic).toBe(query.topic);
  for (const patch of [
    { topic: "x".repeat(201) },
    { platforms: ["youtube"] },
    { language: "en" },
    { dateRange: { from: "2026-01-01", to: "2026-11-07" } },
  ])
    expect(LiveQuerySchema.safeParse({ ...query, ...patch }).success).toBe(false);
  expect(SubmitSchema.safeParse({ query, idempotencyKey: "repeated-click" }).success).toBe(false);
});
it("keys the cache by normalized query, supported filters and processing version", () => {
  expect(cacheIdentity(query)).toBe(
    cacheIdentity({ ...query, topic: "  INTELLIGENCE   ARTIFICIELLE " }),
  );
  expect(cacheIdentity(query)).not.toBe(cacheIdentity({ ...query, topic: "Logement étudiant" }));
});
it("requires explicit kill-switch enablement and all secrets", () => {
  expect(isEnabled({})).toBe(false);
  expect(
    isEnabled({
      JURY_LIVE_ENABLED: "true",
      JURY_ACCESS_PASSWORD: "a".repeat(16),
      ORIANE_API_KEY: "synthetic",
      OPENAI_API_KEY: "synthetic",
    }),
  ).toBe(true);
  expect(LIVE_LIMITS.analyses).toBe(10);
  expect(LIVE_LIMITS.estimatedOrianeCredits * LIVE_LIMITS.analyses).toBe(500);
});
it("blocks cross-site writes and non-JSON login requests", () => {
  const request = (headers: Record<string, string>) =>
    new Request("https://demo.example/api/jury/login", { method: "POST", headers });
  expect(() =>
    assertSameOrigin(
      request({ origin: "https://evil.example", "content-type": "application/json" }),
    ),
  ).toThrow();
  expect(() =>
    assertSameOrigin(request({ origin: "https://demo.example", "content-type": "text/plain" })),
  ).toThrow();
  expect(() =>
    assertSameOrigin(
      request({ origin: "https://demo.example", "content-type": "application/json" }),
    ),
  ).not.toThrow();
});
