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
  dateRange: DateRange;
}

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
  creator: Creator;
  platform: Platform;
  /** ISO date */
  publishedAt: string;
  /** Only when provided by the source. Never invented. */
  sourceUrl?: string;
  frameUrl?: string;
  frameTimestampSec?: number;
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
  videosFound: number;
  videosAnalyzed: number;
  platforms: Platform[];
  dateRange: DateRange;
}

export interface AnalysisResult {
  query: SearchQuery;
  corpus: Corpus;
  /** 0 to 5 narratives */
  narratives: Narrative[];
  mode: "mock" | "live";
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
  readonly mode: "mock" | "live";
  analyze(query: SearchQuery, options?: AnalyzeOptions): Promise<AnalysisResult>;
}

export const ANALYSIS_STEPS: { id: StepId; label: string }[] = [
  { id: "collect", label: "Collecting videos" },
  { id: "retrieve", label: "Retrieving transcripts and evidence" },
  { id: "extract", label: "Extracting arguments" },
  { id: "cluster", label: "Clustering narratives" },
  { id: "verify", label: "Verifying evidence" },
];
