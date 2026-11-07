import { describe, expect, it } from "vitest";
import { normalizeSearchResponse } from "./normalize";
const video = () => ({
  id: "cnt_1",
  platform: "tiktok",
  platformId: "123",
  profileHandle: "creator",
  publishedAt: "2026-01-01",
  media: [
    {
      transcript: "Loyer trop cher",
      transcriptChunks: [{ text: "Loyer trop cher", startSeconds: 1, endSeconds: 2 }],
      onScreenText: ["Logement"],
      frames: [
        {
          id: "frame_1",
          timestampSeconds: 1.5,
          url: "https://example.test/frame",
          onScreenTextRegions: [{ text: "Logement" }],
        },
      ],
    },
  ],
});
const response = (results: unknown[]) => ({
  data: { results },
  metadata: { pagination: { offset: 0, limit: 10, totalCount: results.length } },
});
describe("Oriane normalization", () => {
  it("preserves documented evidence and pagination", () => {
    const result = normalizeSearchResponse(response([video()]));
    expect(result.videos[0]).toMatchObject({
      source: { orianeId: "cnt_1", platformId: "123", creator: "creator", url: null },
      transcript: "Loyer trop cher",
      transcriptChunks: [{ startSeconds: 1, endSeconds: 2 }],
      frames: [{ id: "frame_1", timestampSeconds: 1.5 }],
      onScreenText: ["Logement"],
    });
    expect(result.pagination?.totalCount).toBe(1);
  });
  it("handles missing transcripts and frames", () => {
    const result = normalizeSearchResponse(
      response([{ id: "1", platform: "tiktok", media: [{}] }]),
    );
    expect(result.videos[0]).toMatchObject({ transcript: null, transcriptChunks: [], frames: [] });
  });
  it("deduplicates by Oriane ID", () =>
    expect(normalizeSearchResponse(response([video(), video()])).videos).toHaveLength(1));
  it("accepts empty results and rejects malformed envelopes", () => {
    expect(normalizeSearchResponse(response([])).videos).toEqual([]);
    for (const value of [null, {}, { data: {} }, { data: { results: [null] } }])
      expect(() => normalizeSearchResponse(value)).toThrow();
  });
  it("rejects invalid chunk and frame timestamps", () => {
    const v = video();
    v.media[0]!.transcriptChunks.push(
      { text: "bad", startSeconds: -1, endSeconds: 0 },
      { text: "bad", startSeconds: 4, endSeconds: 2 },
      { text: "bad", startSeconds: NaN, endSeconds: 5 },
    );
    v.media[0]!.frames.push({
      id: "bad",
      timestampSeconds: -1,
      url: "https://example.test",
      onScreenTextRegions: [],
    });
    const result = normalizeSearchResponse(response([v]));
    expect(result.videos[0]?.transcriptChunks).toHaveLength(1);
    expect(result.videos[0]?.frames).toHaveLength(1);
    expect(result.warnings).toHaveLength(4);
  });
});
