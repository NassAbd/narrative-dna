// Ported deterministic evidence validation. Live candidates never receive human-approval status.
import { z } from "zod";
import type { NormalizedVideo } from "./source-types";

export const DiscourseType = z.enum([
  "argument",
  "experience",
  "proposal",
  "objection",
  "question",
  "description",
]);
export const SelectionSchema = z
  .object({
    videos: z.array(
      z
        .object({
          videoId: z.string(),
          relevance: z.enum(["relevant", "irrelevant", "uncertain"]),
          relevanceReason: z.string(),
          claims: z.array(
            z
              .object({
                passageId: z.string(),
                formulation: z.string().min(1),
                type: DiscourseType,
              })
              .strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();
export const ClaimSchema = z
  .object({
    videoId: z.string().min(1),
    passageId: z.string(),
    formulation: z.string().min(1),
    type: DiscourseType,
    quote: z.string().min(1),
    transcriptContext: z.string().min(1),
    startSeconds: z.number().nullable(),
    endSeconds: z.number().nullable(),
  })
  .strict();
export type Claim = z.infer<typeof ClaimSchema>;
export interface Passage {
  passageId: string;
  quote: string;
  transcriptContext: string;
  startSeconds: number | null;
  endSeconds: number | null;
}
export interface CheckedClaim {
  claim: Claim;
  fingerprint: string;
  status: "candidate" | "rejected" | "accepted";
  evidenceValidation: { status: "passed" | "rejected"; reasons: string[] };
  semanticValidation: {
    method: "deterministic_screen";
    status: "screened" | "rejected";
    reasons: string[];
  };
  editorialReview: "required" | "accepted" | "rejected";
  reviewReason: string | null;
}
const validTime = (n: number) => Number.isFinite(n) && n >= 0;
export function passagesFor(video: NormalizedVideo): Passage[] {
  const transcript = video.transcript;
  if (!transcript?.trim()) return [];
  const chunks = video.transcriptChunks.filter(
    (c) =>
      transcript.includes(c.text) &&
      c.text.trim() &&
      validTime(c.startSeconds) &&
      validTime(c.endSeconds) &&
      c.endSeconds >= c.startSeconds,
  );
  const sources = chunks.length
    ? chunks.map((c) => ({ quote: c.text, startSeconds: c.startSeconds, endSeconds: c.endSeconds }))
    : [{ quote: transcript, startSeconds: null, endSeconds: null }];
  return sources.map((s, i) => {
    const at = transcript.indexOf(s.quote);
    return {
      ...s,
      passageId: String(i),
      transcriptContext: transcript.slice(
        Math.max(0, at - 160),
        Math.min(transcript.length, at + s.quote.length + 160),
      ),
    };
  });
}
export function evidenceReasons(claim: Claim, videos: NormalizedVideo[]): string[] {
  const video = videos.find((v) => v.source.orianeId === claim.videoId);
  if (!video) return ["unknown_source"];
  const reasons: string[] = [];
  if (!claim.quote.trim() || !video.transcript?.includes(claim.quote))
    reasons.push("quotation_mismatch");
  if (
    !claim.transcriptContext.trim() ||
    !video.transcript?.includes(claim.transcriptContext) ||
    !claim.transcriptContext.includes(claim.quote)
  )
    reasons.push("context_mismatch");
  const { startSeconds: start, endSeconds: end } = claim;
  if (!(start === null && end === null)) {
    if (start === null || end === null || !validTime(start) || !validTime(end) || end < start)
      reasons.push("invalid_timestamps");
    else {
      const chunks = video.transcriptChunks.filter(
        (c) => c.startSeconds >= start && c.endSeconds <= end,
      );
      if (
        chunks[0]?.startSeconds !== start ||
        chunks.at(-1)?.endSeconds !== end ||
        !chunks
          .map((c) => c.text)
          .join(" ")
          .includes(claim.quote)
      )
        reasons.push("unsupported_timestamps");
    }
  }
  // Bind evidence to the exact source passage; prevents fabricated unavailable timing.
  const passage = passagesFor(video).find((p) => p.passageId === claim.passageId);
  if (
    !passage ||
    passage.quote !== claim.quote ||
    passage.startSeconds !== start ||
    passage.endSeconds !== end
  )
    reasons.push("passage_mismatch");
  return [...new Set(reasons)];
}
const normalized = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
const concepts: [string, RegExp][] = [
  ["discrimination", /discrimin|racis/],
  ["rejection", /refus|rejet/],
  ["unaffordable", /inabordable|trop cher|exorbitant/],
  ["difficulty", /diffic|complique|impossible|ne parvien/],
  ["shortage", /penurie|manque de logement|pas de logement|sans logement|rare/],
  ["urgency", /urgent|urgence/],
  ["eviction", /expuls/],
  ["increase", /augment|hausse/],
  ["decrease", /baiss|diminu/],
  ["causality", /parce qu|a cause|entraine|provoque|conduit a/],
];
export function semanticReasons(claim: Claim): string[] {
  // Deliberately conservative: evidence must be in the selected quote, not an adjacent speaker/context.
  const formulation = normalized(claim.formulation);
  const quote = normalized(claim.quote);
  const reasons: string[] = [];
  for (const [label, pattern] of concepts)
    if (pattern.test(formulation) && !pattern.test(quote)) reasons.push(`unsupported_${label}`);
  const numbers = (s: string) =>
    s.replace(/(\d)[ \u00a0\u202f](?=\d{3}\b)/g, "$1").match(/\d+(?:[.,]\d+)?/g) ?? [];
  const sourceNumbers = new Set(numbers(quote));
  if (numbers(formulation).some((n) => !sourceNumbers.has(n))) reasons.push("unsupported_number");
  const requestOnly =
    /besoin|cherche|recherche/.test(quote) &&
    !/parce qu|trop cher|refus|rejet|discrimin/.test(quote);
  if (
    requestOnly &&
    (claim.type === "argument" || claim.type === "objection" || claim.type === "proposal")
  )
    reasons.push("request_misclassified");
  return reasons;
}
export function checkClaim(claim: Claim, videos: NormalizedVideo[]): CheckedClaim {
  const evidence = evidenceReasons(claim, videos);
  const semantic = semanticReasons(claim);
  return {
    claim,
    fingerprint: JSON.stringify([
      claim.videoId,
      claim.passageId,
      claim.quote,
      claim.formulation,
      claim.type,
      claim.startSeconds,
      claim.endSeconds,
    ]),
    status: evidence.length || semantic.length ? "rejected" : "candidate",
    evidenceValidation: { status: evidence.length ? "rejected" : "passed", reasons: evidence },
    semanticValidation: {
      method: "deterministic_screen",
      status: semantic.length ? "rejected" : "screened",
      reasons: semantic,
    },
    editorialReview: "required",
    reviewReason: null,
  };
}
