export interface VideoSource {
  orianeId: string;
  platformId: string | null;
  platform: string;
  creator: string | null;
  publishedAt: string | null;
  url: string | null;
}
export interface TranscriptChunk {
  text: string;
  startSeconds: number;
  endSeconds: number;
}
export interface VideoFrame {
  id: string | null;
  timestampSeconds: number | null;
  url: string | null;
  onScreenText: string[];
}
export interface NormalizedVideo {
  source: VideoSource;
  transcript: string | null;
  transcriptChunks: TranscriptChunk[];
  frames: VideoFrame[];
  onScreenText: string[];
}
export interface SearchRequest {
  operator: "and";
  filters: {
    platform: { includes: ["tiktok"] };
    format: { includes: ["video"] };
    transcriptLanguage: { includes: ["fr"] };
    transcript: { includesFuzzy: { values: string[]; operator: "or" } };
  };
}
export interface SearchResult {
  videos: NormalizedVideo[];
  pagination: { offset: number; limit: number; totalCount: number } | null;
  warnings: string[];
}
export interface PipelineProgressEvent {
  stage: "search" | "extraction" | "validation" | "clustering" | "evidence";
  status: "started" | "completed" | "failed";
  message?: string;
}
