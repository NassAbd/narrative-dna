// Data contracts for Narrative DNA. A future live backend (Oriane + OpenAI)
// must produce exactly these shapes so the UI needs no rewrite.

export type Platform = "tiktok" | "instagram" | "youtube";

export interface DateRange {
  /** ISO date (YYYY-MM-DD) */
  from: string;
  /** ISO date (YYYY-MM-DD) */
  to: string;
}

export interface SearchQuery {
  topic: string;
  platforms: Platform[];
  dateRange: DateRange | null;
}

export type AnalysisMode = "mock" | "live" | "precomputed";
export type DiscourseType =
  "argument" | "experience" | "proposal" | "objection" | "question" | "description";

export type EvidenceSourceType = "transcript" | "onScreenText";

export interface Creator {
  handle: string;
  displayName?: string;
}

export interface EvidenceClip {
  id: string;
  /** Original Oriane content identifier */
  videoId: string;
  /** Exact original-language quotation */
  quote: string;
  startSec: number | null;
  endSec: number | null;
  sourceType: EvidenceSourceType;
  transcriptContext?: string;
  creator: Creator | null;
  platform: Platform | null;
  /** ISO date */
  publishedAt: string | null;
  /** Only when provided by the source. Never invented. */
  sourceUrl?: string;
  /** Verified official TikTok post ID, never an Oriane content ID. */
  tiktokPostId?: string;
  frameUrl?: string;
  frameTimestampSec?: number;
  formulation?: string;
  discourseType?: DiscourseType;
  provenance?: "precomputed" | "mock" | "live";
}

export interface Narrative {
  id: string;
  /** Neutral, attributed argument */
  claim: string;
  summary: string;
  /** Number of analyzed videos that support this argument */
  supportingVideoCount: number;
  evidence: EvidenceClip[];
}

export interface Corpus {
  approvedClaimCount?: number;
  videosFound: number;
  videosAnalyzed: number;
  platforms: Platform[];
  dateRange: DateRange | null;
}

export interface AnalysisResult {
  cached?: boolean;
  warnings?: string[];
  counts?: import("../jury/contracts").LiveCounts;
  metrics?: import("../jury/contracts").LiveMetrics;
  query: SearchQuery;
  corpus: Corpus;
  individualObservations?: EvidenceClip[];
  /** 0 to 5 narratives */
  narratives: Narrative[];
  mode: AnalysisMode;
}

export type StepId = "collect" | "retrieve" | "extract" | "cluster" | "verify";
export type StepStatus = "pending" | "active" | "done" | "error";

export interface ProgressEvent {
  step: StepId;
  status: StepStatus;
  processed?: number;
  total?: number;
  message?: string;
}

export interface AnalyzeOptions {
  onProgress?: (event: ProgressEvent) => void;
  signal?: AbortSignal;
}

export interface NarrativeService {
  readonly mode: AnalysisMode;
  analyze(query: SearchQuery, options?: AnalyzeOptions): Promise<AnalysisResult>;
}

export const ANALYSIS_STEPS: { id: StepId; label: string }[] = [
  { id: "collect", label: "Collecting videos" },
  { id: "retrieve", label: "Retrieving transcripts and evidence" },
  { id: "extract", label: "Extracting arguments" },
  { id: "cluster", label: "Clustering narratives" },
  { id: "verify", label: "Verifying evidence" },
];
