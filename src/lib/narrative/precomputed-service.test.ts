import { describe, expect, it, vi } from "vitest";
import { createPrecomputedNarrativeService, PRECOMPUTED_QUERY } from "./precomputed-service";
import { formatDate, formatTime } from "./format";

describe("offline precomputed service", () => {
  it("loads approved evidence without network calls", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    try {
      const result = await createPrecomputedNarrativeService().analyze(PRECOMPUTED_QUERY);
      expect(result.narratives).toHaveLength(2);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("does not relabel fixed evidence as a new topic or date search", async () => {
    const service = createPrecomputedNarrativeService();
    await expect(service.analyze({ ...PRECOMPUTED_QUERY, topic: "Football" })).rejects.toThrow(
      "fixed precomputed",
    );
    await expect(
      service.analyze({
        ...PRECOMPUTED_QUERY,
        dateRange: { from: "2026-01-01", to: "2026-02-01" },
      }),
    ).rejects.toThrow();
  });
  it("respects an aborted request", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      createPrecomputedNarrativeService().analyze(PRECOMPUTED_QUERY, { signal: ctrl.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("preserves fractional timestamp display and missing-date fallbacks", () => {
    expect(formatTime(60.476)).toBe("1:00.476");
    expect(formatTime(115.46)).toBe("1:55.46");
    expect(formatDate(null)).toBeNull();
    expect(formatDate("bad")).toBeNull();
  });
});
