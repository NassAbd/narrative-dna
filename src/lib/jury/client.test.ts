import { expect, it, vi } from "vitest";
import { createJuryClient } from "./client";
import { LiveResultSchema } from "./result-schema";
it("keeps login credentials in the request body and sends CSRF only after authentication", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ available: true, authenticated: true, csrfToken: "csrf", remaining: 10 }),
    )
    .mockResolvedValueOnce(Response.json({ ok: true }));
  const client = createJuryClient(fetcher);
  await client.login("private-test-password");
  await client.logout();
  expect(fetcher.mock.calls[0]?.[0]).toBe("/api/jury/login");
  expect(fetcher.mock.calls[0]?.[1]?.body).toBe(
    JSON.stringify({ password: "private-test-password" }),
  );
  expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({ "x-csrf-token": "csrf" });
  expect(fetcher.mock.calls[0]?.[1]?.credentials).toBe("same-origin");
});
it("sanitizes private backend errors", async () => {
  const client = createJuryClient(
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { errorCode: "invalid_credentials", detail: "private diagnostics" },
          { status: 401 },
        ),
      ),
  );
  await expect(client.login("wrong")).rejects.toThrow("Incorrect password.");
});
it("refuses fabricated live quotation context and reversed timestamps", () => {
  const base = {
    query: { topic: "topic", platforms: ["tiktok"], dateRange: null },
    corpus: { videosFound: 1, videosAnalyzed: 1, platforms: ["tiktok"], dateRange: null },
    narratives: [],
    individualObservations: [
      {
        id: "c1",
        videoId: "v1",
        quote: "exact words",
        transcriptContext: "different words",
        startSec: 10,
        endSec: 1,
        sourceType: "transcript",
        creator: null,
        platform: "tiktok",
        publishedAt: null,
        formulation: "claim",
        discourseType: "experience",
        provenance: "live",
      },
    ],
    mode: "live",
    counts: {
      resultsFound: 1,
      uniqueVideosRetained: 1,
      relevantVideos: 1,
      videosAnalyzed: 1,
      videosContributingEvidence: 1,
    },
    metrics: {
      orianeMs: 0,
      normalizationMs: 0,
      extractionMs: 0,
      clusteringMs: 0,
      verificationMs: 0,
      totalMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedOpenaiUsd: 0,
      estimatedOrianeCredits: 50,
      confirmedOrianeCredits: null,
    },
  };
  expect(LiveResultSchema.safeParse(base).success).toBe(false);
  base.individualObservations[0]!.transcriptContext = "exact words";
  base.individualObservations[0]!.endSec = 11;
  expect(LiveResultSchema.safeParse(base).success).toBe(true);
});

it("fails closed with a concise error for malformed server sessions", async () => {
  const client = createJuryClient(
    vi.fn<typeof fetch>().mockResolvedValue(Response.json({ available: true })),
  );
  await expect(client.session()).rejects.toThrow("Jury Live is temporarily unavailable.");
});
it("reports persisted stages and executes a queued job at most once", async () => {
  vi.useFakeTimers();
  try {
    const job = {
      id: "job-1",
      status: "queued",
      stage: "search",
      completedStages: [],
      cached: false,
      remaining: 9,
    };
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
      if (String(url).endsWith("/run"))
        return Response.json({ ...job, status: "failed", errorCode: "timeout" });
      if (String(url) === "/api/jury/jobs") return Response.json(job);
      return Response.json({
        ...job,
        status: "failed",
        stage: "extract",
        completedStages: ["search", "retrieve"],
        errorCode: "timeout",
      });
    });
    const progress = vi.fn();
    const client = createJuryClient(fetcher);
    const completion = expect(
      client.analyze(
        { topic: "arbitrary topic", platforms: ["tiktok"], language: "fr", dateRange: null },
        { onProgress: progress },
      ),
    ).rejects.toThrow("Analysis timed out.");
    await vi.advanceTimersByTimeAsync(1000);
    await completion;
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/run"))).toHaveLength(1);
    expect(progress).toHaveBeenCalledWith({ step: "collect", status: "done" });
    expect(progress).toHaveBeenCalledWith({ step: "extract", status: "active" });
    expect(progress).not.toHaveBeenCalledWith({ step: "verify", status: "done" });
  } finally {
    vi.useRealTimers();
  }
});
