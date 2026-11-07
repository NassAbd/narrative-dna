// Ported from the validated experiment; public schema is unchanged.
import type { NormalizedVideo, SearchResult, TranscriptChunk, VideoFrame } from "./source-types";

type RecordValue = Record<string, unknown>;
const record = (v: unknown): v is RecordValue =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const time = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];

export function normalizeSearchResponse(value: unknown): SearchResult {
  if (!record(value) || !record(value["data"]) || !Array.isArray(value["data"]["results"]))
    throw new Error("Malformed Oriane response: expected data.results array");
  const warnings: string[] = [];
  const videos: NormalizedVideo[] = [];
  const seen = new Set<string>();
  for (const item of value["data"]["results"]) {
    if (!record(item) || !str(item["id"]) || !str(item["platform"]))
      throw new Error("Malformed Oriane result: missing id or platform");
    const id = str(item["id"])!;
    if (seen.has(id)) {
      warnings.push(`Duplicate video ${id} omitted`);
      continue;
    }
    seen.add(id);
    if (item["media"] != null && !Array.isArray(item["media"]))
      throw new Error(`Malformed media for video ${id}`);
    const chunks: TranscriptChunk[] = [];
    const frames: VideoFrame[] = [];
    const texts: string[] = [];
    const transcripts: string[] = [];
    for (const media of (item["media"] ?? []) as unknown[]) {
      if (!record(media)) throw new Error(`Malformed media for video ${id}`);
      const transcript = str(media["transcript"]);
      if (transcript) transcripts.push(transcript);
      texts.push(...strings(media["onScreenText"]));
      if (media["transcriptChunks"] != null && !Array.isArray(media["transcriptChunks"]))
        throw new Error(`Malformed transcript chunks for video ${id}`);
      for (const chunk of (media["transcriptChunks"] ?? []) as unknown[]) {
        if (
          !record(chunk) ||
          !str(chunk["text"]) ||
          !time(chunk["startSeconds"]) ||
          !time(chunk["endSeconds"]) ||
          chunk["endSeconds"] < chunk["startSeconds"]
        ) {
          warnings.push(`Invalid transcript chunk in ${id} omitted`);
          continue;
        }
        chunks.push({
          text: chunk["text"] as string,
          startSeconds: chunk["startSeconds"],
          endSeconds: chunk["endSeconds"],
        });
      }
      if (media["frames"] != null && !Array.isArray(media["frames"]))
        throw new Error(`Malformed frames for video ${id}`);
      for (const frame of (media["frames"] ?? []) as unknown[]) {
        if (
          !record(frame) ||
          (frame["timestampSeconds"] != null && !time(frame["timestampSeconds"]))
        ) {
          warnings.push(`Invalid frame in ${id} omitted`);
          continue;
        }
        const frameTexts = Array.isArray(frame["onScreenTextRegions"])
          ? frame["onScreenTextRegions"]["flatMap"]((region) =>
              record(region) && str(region["text"]) ? [str(region["text"])!] : [],
            )
          : [];
        frames.push({
          id: str(frame["id"]),
          timestampSeconds: time(frame["timestampSeconds"]) ? frame["timestampSeconds"] : null,
          url: str(frame["url"]),
          onScreenText: frameTexts,
        });
      }
    }
    videos.push({
      source: {
        orianeId: id,
        platformId: str(item["platformId"]),
        platform: str(item["platform"])!,
        creator: str(item["profileHandle"]),
        publishedAt: str(item["publishedAt"]),
        url: null,
      },
      transcript: transcripts.length ? transcripts.join("\n") : null,
      transcriptChunks: chunks,
      frames,
      onScreenText: [...new Set(texts)],
    });
  }
  let pagination: SearchResult["pagination"] = null;
  if (record(value["metadata"]) && record(value["metadata"]["pagination"])) {
    const p = value["metadata"]["pagination"];
    if (time(p["offset"]) && time(p["limit"]) && time(p["totalCount"]))
      pagination = { offset: p["offset"], limit: p["limit"], totalCount: p["totalCount"] };
    else warnings.push("Invalid pagination metadata");
  } else warnings.push("Pagination metadata unavailable");
  return { videos, pagination, warnings };
}
