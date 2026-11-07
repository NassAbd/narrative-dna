import { z } from "zod";
export const LIVE_VERSION = "jury-v4-gpt4o-mini-2026-11-07";
export const LIVE_LIMITS = {
  analyses: 10,
  concurrent: 1,
  videos: 10,
  topic: 200,
  responseBytes: 2_000_000,
  transcriptChars: 40_000,
  videoChars: 6000,
  passages: 250,
  extractionTokens: 3000,
  groupingTokens: 1500,
  providerCalls: 3,
  estimatedOrianeCredits: 50,
  estimatedOrianeBudget: 500,
  reservedOpenaiUsd: 0.1,
  maximumOpenaiReservedUsd: 1,
  executionMs: 55_000,
} as const;
export const LiveQuerySchema = z
  .object({
    topic: z.string().trim().min(3).max(LIVE_LIMITS.topic),
    platforms: z.tuple([z.literal("tiktok")]),
    language: z.literal("fr"),
    dateRange: z.null(),
  })
  .strict();
export type LiveQuery = z.infer<typeof LiveQuerySchema>;
export const SubmitSchema = z
  .object({ query: LiveQuerySchema, idempotencyKey: z.string().uuid() })
  .strict();
export const LoginSchema = z.object({ password: z.string().min(1).max(128) }).strict();
export const JobIdSchema = z.string().uuid();
export const STAGES = ["search", "retrieve", "extract", "group", "verify", "ready"] as const;
export type LiveStage = (typeof STAGES)[number];
export const JobStatusSchema = z.enum(["queued", "running", "completed", "failed", "cancelled"]);
export interface LiveMetrics {
  orianeRequests?: number;
  openaiRequests?: number;
  orianeMs: number;
  normalizationMs: number;
  extractionMs: number;
  clusteringMs: number;
  verificationMs: number;
  totalMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedOpenaiUsd: number;
  estimatedOrianeCredits: number;
  confirmedOrianeCredits: null;
}
export interface LiveCounts {
  resultsFound: number | null;
  uniqueVideosRetained: number;
  relevantVideos: number;
  videosAnalyzed: number;
  videosContributingEvidence: number;
}
export interface JurySession {
  available: boolean;
  authenticated: boolean;
  csrfToken?: string;
  remaining?: number;
  activeJobId?: string | null;
}
export interface LiveJob {
  id: string;
  status: z.infer<typeof JobStatusSchema>;
  stage: LiveStage;
  completedStages: LiveStage[];
  cached: boolean;
  errorCode?: string | null;
  result?: unknown;
  remaining: number;
}
export function normalizeQuery(query: LiveQuery): LiveQuery {
  return { ...query, topic: query.topic.normalize("NFC").trim().replace(/\s+/g, " ") };
}
export function cacheIdentity(query: LiveQuery): string {
  return JSON.stringify({
    ...normalizeQuery(query),
    topic: normalizeQuery(query).topic.toLocaleLowerCase("fr"),
    version: LIVE_VERSION,
  });
}
export function assertSameOrigin(request: Request): void {
  if (["GET", "HEAD"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    throw new Error("csrf_rejected");
}
export function isEnabled(secrets: Record<string, string | undefined>): boolean {
  return (
    secrets["JURY_LIVE_ENABLED"] === "true" &&
    (secrets["JURY_ACCESS_PASSWORD"]?.length ?? 0) >= 16 &&
    Boolean(secrets["ORIANE_API_KEY"] && secrets["OPENAI_API_KEY"])
  );
}
