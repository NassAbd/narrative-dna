import { describe, expect, it } from "vitest";
import data from "./approved-demo.json";
import { adaptValidatedPayload } from "./validated-adapter";

describe("approved precomputed adapter", () => {
  it("keeps two real groups, distinct video counts and three separate observations", () => {
    const result = adaptValidatedPayload(data);
    expect(result.mode).toBe("precomputed");
    expect(result.narratives.map((n) => n.claim)).toEqual(data.narratives.map((n) => n.title));
    expect(result.narratives.map((n) => n.supportingVideoCount)).toEqual([2, 2]);
    expect(result.corpus.videosAnalyzed).toBe(5);
    expect(result.corpus.approvedClaimCount).toBe(9);
    expect(result.individualObservations?.map((c) => c.id)).toEqual(["S01", "S02", "S10"]);
  });
  it("preserves every approved quote, source, context, type and exact fractional timestamp", () => {
    const result = adaptValidatedPayload(data);
    const clips = [
      ...result.narratives.flatMap((n) => n.evidence),
      ...result.individualObservations!,
    ];
    expect(clips).toHaveLength(9);
    for (const c of data.claims)
      expect(clips.find((e) => e.id === c.id)).toMatchObject({
        quote: c.quote,
        videoId: c.videoId,
        transcriptContext: c.transcriptContext,
        startSec: c.startSeconds,
        endSec: c.endSeconds,
        discourseType: c.type,
        creator: c.creator,
        publishedAt: c.publishedAt,
        frameUrl: c.frameUrl,
        frameTimestampSec: c.frameTimestampSec,
      });
    expect(
      clips.every(
        (c) =>
          c.sourceUrl?.startsWith("https://www.tiktok.com/@") &&
          c.frameUrl?.startsWith("https://social-catalog-static.oriane.xyz/") &&
          !c.videoId.startsWith("mock-"),
      ),
    ).toBe(true);
  });
  it("rejects missing approval, invalid quotes/times and invented membership", () => {
    for (const change of [
      (v: typeof data) => {
        v.claims[0]!.approval.origin = "model";
      },
      (v: typeof data) => {
        v.claims[0]!.quote = "Fabricated quotation";
      },
      (v: typeof data) => {
        v.claims[0]!.startSeconds = -1;
      },
      (v: typeof data) => {
        v.claims[0]!.endSeconds = 0;
      },
      (v: typeof data) => {
        v.narratives[0]!.claimIds.push("unknown");
      },
      (v: typeof data) => {
        v.unclusteredClaimIds.push("S03");
      },
    ]) {
      const copy = structuredClone(data);
      change(copy);
      expect(() => adaptValidatedPayload(copy)).toThrow();
    }
  });
});

it("retains graceful fallbacks for a sanitized payload without optional enrichment", () => {
  const stripped = {
    ...data,
    claims: data.claims.map(
      ({ creator, publishedAt, frameUrl, frameTimestampSec, ...claim }) => claim,
    ),
  };
  const result = adaptValidatedPayload(stripped);
  for (const clip of [
    ...result.narratives.flatMap((n) => n.evidence),
    ...result.individualObservations!,
  ]) {
    expect(clip.creator).toBeNull();
    expect(clip.publishedAt).toBeNull();
    expect(clip.frameUrl).toBeUndefined();
  }
});
it("rejects credential-bearing, signed, private or malformed frame metadata", () => {
  for (const frameUrl of [
    "https://social-catalog-static.oriane.xyz/frame.webp?token=secret",
    "https://user:secret@social-catalog-static.oriane.xyz/frame.webp",
    "http://social-catalog-static.oriane.xyz/frame.webp",
    "https://private.example/frame.webp",
  ]) {
    const copy = structuredClone(data);
    copy.claims[0]!.frameUrl = frameUrl;
    expect(() => adaptValidatedPayload(copy)).toThrow();
  }
  const copy = structuredClone(data);
  copy.claims[0]!.frameTimestampSec = -1;
  expect(() => adaptValidatedPayload(copy)).toThrow();
});
