import { z } from "zod";
import { JobStatusSchema, STAGES } from "./contracts";
const timestamp = z.number().finite().nonnegative().nullable();
const clip = z
  .object({
    id: z.string(),
    videoId: z.string(),
    quote: z.string().min(1).max(6500),
    startSec: timestamp,
    endSec: timestamp,
    sourceType: z.literal("transcript"),
    transcriptContext: z.string().max(8000),
    creator: z.object({ handle: z.string(), displayName: z.string().optional() }).nullable(),
    platform: z.literal("tiktok"),
    publishedAt: z.string().nullable(),
    formulation: z.string().min(1).max(1000),
    discourseType: z.enum([
      "argument",
      "experience",
      "proposal",
      "objection",
      "question",
      "description",
    ]),
    provenance: z.literal("live"),
    frameUrl: z
      .string()
      .url()
      .refine((s) => {
        const u = new URL(s);
        return (
          u.protocol === "https:" &&
          u.hostname === "social-catalog-static.oriane.xyz" &&
          !u.search &&
          !u.username &&
          !u.password
        );
      })
      .optional(),
    frameTimestampSec: z.number().finite().nonnegative().optional(),
  })
  .superRefine((c, ctx) => {
    if (
      !c.transcriptContext.includes(c.quote) ||
      (!(c.startSec === null && c.endSec === null) &&
        (c.startSec === null || c.endSec === null || c.endSec < c.startSec))
    )
      ctx.addIssue({ code: "custom", message: "Invalid source evidence" });
  });
const count = z.number().int().nonnegative();
export const LiveResultSchema = z
  .object({
    query: z.object({
      topic: z.string(),
      platforms: z.array(z.literal("tiktok")),
      dateRange: z.null(),
    }),
    corpus: z.object({
      videosFound: count,
      videosAnalyzed: count.max(10),
      platforms: z.array(z.literal("tiktok")),
      dateRange: z.null(),
    }),
    narratives: z
      .array(
        z.object({
          id: z.string(),
          claim: z.string(),
          summary: z.string(),
          supportingVideoCount: count.max(10),
          evidence: z.array(clip),
        }),
      )
      .max(5),
    individualObservations: z.array(clip),
    mode: z.literal("live"),
    cached: z.boolean().optional(),
    warnings: z.array(z.string()).optional(),
    counts: z.object({
      resultsFound: count.nullable(),
      uniqueVideosRetained: count.max(10),
      relevantVideos: count.max(10),
      videosAnalyzed: count.max(10),
      videosContributingEvidence: count.max(10),
    }),
    metrics: z.object({
      orianeMs: count,
      normalizationMs: count,
      extractionMs: count,
      clusteringMs: count,
      verificationMs: count,
      totalMs: count,
      inputTokens: count,
      outputTokens: count,
      estimatedOpenaiUsd: z.number().nonnegative(),
      estimatedOrianeCredits: count,
      confirmedOrianeCredits: z.null(),
    }),
  })
  .superRefine((r, ctx) => {
    for (const n of r.narratives)
      if (n.supportingVideoCount !== new Set(n.evidence.map((c) => c.videoId)).size)
        ctx.addIssue({ code: "custom", message: "Invalid supporting-video count" });
  });
export const SessionSchema = z.object({
  available: z.boolean(),
  authenticated: z.boolean(),
  csrfToken: z.string().optional(),
  remaining: count.max(10).optional(),
  activeJobId: z.string().nullable().optional(),
});
export const LiveJobSchema = z.object({
  id: z.string(),
  status: JobStatusSchema,
  stage: z.enum(STAGES),
  completedStages: z.array(z.enum(STAGES)),
  cached: z.boolean(),
  remaining: count.max(10),
  errorCode: z.string().nullable().optional(),
  result: LiveResultSchema.nullable().optional(),
});
