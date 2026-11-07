import { describe, expect, it } from "vitest";
import { computeMockResult, createMockNarrativeService } from "./mock-service";
import { ANALYSIS_STEPS, type ProgressEvent, type SearchQuery } from "./types";

const q = (over: Partial<SearchQuery> = {}): SearchQuery => ({
  topic: "Logement en France",
  platforms: ["tiktok", "instagram", "youtube"],
  dateRange: { from: "2026-10-01", to: "2026-11-07" },
  ...over,
});

describe("mock narrative service", () => {
  it("only returns evidence from selected platforms", () => {
    const r = computeMockResult(q({ platforms: ["youtube"] }));
    const all = r.narratives.flatMap((n) => n.evidence);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((e) => e.platform === "youtube")).toBe(true);
  });

  it("returns 0 narratives for an unrelated topic", () => {
    expect(computeMockResult(q({ topic: "Football" })).narratives).toHaveLength(0);
  });

  it("throws on the simulated error topic", () => {
    expect(() => computeMockResult(q({ topic: "error" }))).toThrow();
  });

  it("varies narrative count between 0 and 5 with filters", () => {
    const all = computeMockResult(q()).narratives.length;
    const yt = computeMockResult(q({ platforms: ["youtube"] })).narratives.length;
    expect(all).toBe(5);
    expect(yt).toBeLessThan(all);
    expect(yt).toBeGreaterThan(0);
  });

  it("allows one video to support multiple narratives", () => {
    const r = computeMockResult(q());
    const ids = r.narratives.map((n) => new Set(n.evidence.map((e) => e.videoId)));
    const shared = [...(ids[0] ?? [])].some((id) => ids.slice(1).some((s) => s.has(id)));
    expect(shared).toBe(true);
  });

  it("includes clips with missing optional fields and never invents URLs", () => {
    const clips = computeMockResult(q()).narratives.flatMap((n) => n.evidence);
    expect(clips.some((c) => c.startSec === null && c.endSec === null)).toBe(true);
    expect(clips.some((c) => c.transcriptContext === undefined)).toBe(true);
    expect(clips.every((c) => c.sourceUrl === undefined)).toBe(true);
  });

  it("emits all five steps in order, each ending done", async () => {
    const events: ProgressEvent[] = [];
    await createMockNarrativeService(0).analyze(q(), { onProgress: (e) => events.push(e) });
    const done = events.filter((e) => e.status === "done").map((e) => e.step);
    expect(done).toEqual(ANALYSIS_STEPS.map((s) => s.id));
  });

  it("emits an error step and rejects on failure", async () => {
    const events: ProgressEvent[] = [];
    await expect(
      createMockNarrativeService(0).analyze(q({ topic: "error" }), {
        onProgress: (e) => events.push(e),
      }),
    ).rejects.toThrow();
    expect(events.some((e) => e.status === "error")).toBe(true);
  });
});
