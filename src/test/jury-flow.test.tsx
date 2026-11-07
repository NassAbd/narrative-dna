import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { Index } from "@/routes/index";
import { JuryLivePanel } from "@/components/narrative/JuryLivePanel";
import { EvidenceDrawer } from "@/components/narrative/EvidenceDrawer";
import type { EvidenceClip, Narrative } from "@/lib/narrative";
function LiveHarness() {
  const [open, setOpen] = useState<{ clip: EvidenceClip; narrative: Narrative | null } | null>(
    null,
  );
  return (
    <>
      <JuryLivePanel onOpen={(clip, narrative) => setOpen({ clip, narrative })} />
      <EvidenceDrawer
        clip={open?.clip ?? null}
        narrative={open?.narrative ?? null}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("contacts no backend in Explore and gracefully disables unavailable Jury Live", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ available: false, authenticated: false }));
  vi.stubGlobal("fetch", fetcher);
  render(<Index />);
  expect(fetcher).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Jury Live" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Jury password")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Analyze narratives" })).toBeInTheDocument();
  cleanup();
  render(<LiveHarness />);
  await screen.findByText(/Jury Live is currently unavailable/);
});
it("requires server authentication and clears an invalid password", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ available: true, authenticated: false }))
    .mockResolvedValueOnce(Response.json({ errorCode: "invalid_credentials" }, { status: 401 }));
  vi.stubGlobal("fetch", fetcher);
  render(<LiveHarness />);
  const input = await screen.findByLabelText("Jury password");
  fireEvent.change(input, { target: { value: "bad-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock Jury Live" }));
  await screen.findByText("Incorrect password.");
  expect(input).toHaveValue("");
  expect(screen.queryByRole("button", { name: "Analyze narratives" })).not.toBeInTheDocument();
});
it("renders cached live evidence without calling it human-approved or issuing provider requests", async () => {
  const clip = {
    id: "live-c1",
    videoId: "test-video",
    quote: "Une citation exacte de test.",
    transcriptContext: "Contexte. Une citation exacte de test. Suite.",
    startSec: 2,
    endSec: 5,
    sourceType: "transcript",
    creator: null,
    platform: "tiktok",
    publishedAt: null,
    formulation: "Une expérience de test.",
    discourseType: "experience",
    provenance: "live",
  };
  const result = {
    query: { topic: "Sujet de test", platforms: ["tiktok"], dateRange: null },
    corpus: { videosFound: 1, videosAnalyzed: 1, platforms: ["tiktok"], dateRange: null },
    narratives: [],
    individualObservations: [clip],
    mode: "live",
    counts: {
      resultsFound: 1,
      uniqueVideosRetained: 1,
      relevantVideos: 1,
      videosAnalyzed: 1,
      videosContributingEvidence: 1,
    },
    metrics: {
      orianeMs: 200,
      normalizationMs: 1,
      extractionMs: 500,
      clusteringMs: 0,
      verificationMs: 1,
      totalMs: 702,
      inputTokens: 200,
      outputTokens: 30,
      estimatedOpenaiUsd: 0.0001,
      estimatedOrianeCredits: 50,
      confirmedOrianeCredits: null,
    },
  };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ available: true, authenticated: false }))
    .mockResolvedValueOnce(
      Response.json({ available: true, authenticated: true, csrfToken: "csrf", remaining: 0 }),
    )
    .mockResolvedValueOnce(
      Response.json({
        id: "cached-job",
        status: "completed",
        stage: "ready",
        completedStages: ["search", "retrieve", "extract", "group", "verify", "ready"],
        cached: true,
        remaining: 0,
        result,
      }),
    )
    .mockResolvedValue(
      Response.json({ available: true, authenticated: true, csrfToken: "csrf", remaining: 0 }),
    );
  vi.stubGlobal("fetch", fetcher);
  render(<LiveHarness />);
  fireEvent.change(await screen.findByLabelText("Jury password"), {
    target: { value: "private-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Unlock Jury Live" }));
  const topic = await screen.findByRole("textbox", { name: "Topic" });
  fireEvent.change(topic, { target: { value: "Sujet de test" } });
  fireEvent.click(screen.getByRole("button", { name: "Analyze narratives" }));
  await screen.findByText("Cached live");
  expect(
    screen.getByText(/AI-GENERATED · SOURCE-VERIFIED · NOT EDITORIALLY REVIEWED/),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: /Evidence from Creator unavailable on TikTok/ }),
  );
  const drawer = await screen.findByRole("dialog");
  expect(drawer).toHaveTextContent(clip.transcriptContext);
  expect(drawer).toHaveTextContent("test-video");
  expect(drawer).toHaveTextContent("2 – 5 s");
  expect(drawer).not.toHaveTextContent("Human-approved");
  expect(drawer).toHaveTextContent("Original link not provided.");
  expect(fetcher.mock.calls.every(([url]) => String(url).startsWith("/api/jury/"))).toBe(true);
});
