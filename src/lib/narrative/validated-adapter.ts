import { z } from "zod";
import { verifiedOriginalMedia } from "./original-media";
import type { AnalysisResult, EvidenceClip, SearchQuery } from "./types";

const time = z.number().finite().nonnegative().nullable();
const claimSchema = z
  .object({
    id: z.string().min(1),
    videoId: z.string().min(1),
    passageId: z.string(),
    formulation: z.string().min(1),
    type: z.enum(["argument", "experience", "proposal", "objection", "question", "description"]),
    quote: z.string().min(1),
    transcriptContext: z.string().min(1),
    startSeconds: time,
    endSeconds: time,
    platform: z.enum(["tiktok", "instagram", "youtube"]).nullable().optional(),
    creator: z
      .object({ handle: z.string().min(1), displayName: z.string().min(1).optional() })
      .nullable()
      .optional(),
    publishedAt: z.string().datetime({ offset: true }).nullable().optional(),
    frameUrl: z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          url.hostname === "social-catalog-static.oriane.xyz" &&
          !url.search &&
          !url.username &&
          !url.password &&
          !url.hash
        );
      }, "Frame must be an unsigned public Oriane image URL")
      .optional(),
    frameTimestampSec: z.number().finite().nonnegative().optional(),
    approval: z.object({ origin: z.literal("explicit_human_decision") }),
  })
  .superRefine((claim, ctx) => {
    if ((claim.frameUrl === undefined) !== (claim.frameTimestampSec === undefined))
      ctx.addIssue({
        code: "custom",
        message: "Frame URL and source timestamp must be supplied together",
      });
    if (!claim.transcriptContext.includes(claim.quote))
      ctx.addIssue({ code: "custom", message: "Quotation is absent from source context" });
    if (
      !(claim.startSeconds === null && claim.endSeconds === null) &&
      (claim.startSeconds === null ||
        claim.endSeconds === null ||
        claim.endSeconds < claim.startSeconds)
    )
      ctx.addIssue({ code: "custom", message: "Invalid timestamp pair" });
  });
/** Public projection of the experiment's approved schema; reviewer identity and fingerprints are intentionally omitted. */
export const ValidatedPayloadSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    status: z.literal("narratives_require_editorial_review"),
    claims: z.array(claimSchema).min(1),
    narratives: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          summary: z.string(),
          claimIds: z.array(z.string()),
        }),
      )
      .max(4),
    unclusteredClaimIds: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    const ids = data.claims.map((c) => c.id);
    const assigned = [...data.narratives.flatMap((n) => n.claimIds), ...data.unclusteredClaimIds];
    if (
      new Set(ids).size !== ids.length ||
      assigned.length !== ids.length ||
      new Set(assigned).size !== assigned.length ||
      assigned.some((id) => !ids.includes(id))
    )
      ctx.addIssue({ code: "custom", message: "Membership must partition approved claims" });
    if (new Set(data.narratives.map((n) => n.id)).size !== data.narratives.length)
      ctx.addIssue({ code: "custom", message: "Duplicate narrative ID" });
    for (const n of data.narratives) {
      const claims = data.claims.filter((c) => n.claimIds.includes(c.id));
      if (
        new Set(claims.map((c) => c.videoId)).size < 2 ||
        !claims.some((c) => ["argument", "experience", "proposal", "objection"].includes(c.type))
      )
        ctx.addIssue({
          code: "custom",
          message: "Narrative requires substantive support from two videos",
        });
    }
  });
export const PRECOMPUTED_QUERY: SearchQuery = {
  topic: "Logement en France",
  platforms: ["tiktok"],
  dateRange: null,
};

export function adaptValidatedPayload(input: unknown): AnalysisResult {
  const payload = ValidatedPayloadSchema.parse(input);
  const evidence = new Map<string, EvidenceClip>(
    payload.claims.map((c) => [
      c.id,
      {
        id: c.id,
        videoId: c.videoId,
        quote: c.quote,
        transcriptContext: c.transcriptContext,
        startSec: c.startSeconds,
        endSec: c.endSeconds,
        sourceType: "transcript",
        creator: c.creator
          ? {
              handle: c.creator.handle,
              ...(c.creator.displayName ? { displayName: c.creator.displayName } : {}),
            }
          : null,
        publishedAt: c.publishedAt ?? null,
        ...(c.frameUrl ? { frameUrl: c.frameUrl, frameTimestampSec: c.frameTimestampSec! } : {}),
        platform: c.platform ?? null,
        formulation: c.formulation,
        discourseType: c.type,
        provenance: "precomputed",
        ...verifiedOriginalMedia(c.videoId, c.platform ?? null),
      },
    ]),
  );
  const resolve = (ids: string[]) => ids.map((id) => evidence.get(id)!);
  const platforms = [...new Set(payload.claims.flatMap((c) => (c.platform ? [c.platform] : [])))];
  const sourceCount = new Set(payload.claims.map((c) => c.videoId)).size;
  return {
    mode: "precomputed",
    query: { ...PRECOMPUTED_QUERY, platforms },
    corpus: {
      videosFound: sourceCount,
      videosAnalyzed: sourceCount,
      approvedClaimCount: payload.claims.length,
      platforms,
      dateRange: null,
    },
    narratives: payload.narratives.map((n) => {
      const clips = resolve(n.claimIds);
      return {
        id: n.id,
        claim: n.title,
        summary: n.summary,
        supportingVideoCount: new Set(clips.map((c) => c.videoId)).size,
        evidence: clips,
      };
    }),
    individualObservations: resolve(payload.unclusteredClaimIds),
  };
}
