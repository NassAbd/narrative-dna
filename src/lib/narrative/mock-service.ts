import { MOCK_CORPUS_COUNTS, MOCK_NARRATIVES, MOCK_TOPIC_KEYWORDS } from "./mock-data";
import type {
  AnalysisResult,
  AnalyzeOptions,
  NarrativeService,
  ProgressEvent,
  SearchQuery,
  StepId,
} from "./types";
import { ANALYSIS_STEPS } from "./types";

export class MockAnalysisError extends Error {}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (ms <= 0) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/** Pure mock computation, exported for tests. */
export function computeMockResult(query: SearchQuery): AnalysisResult {
  const topic = query.topic.toLowerCase();
  if (topic.includes("error"))
    throw new MockAnalysisError("The mock analysis failed (simulated error).");

  const matchesTopic = MOCK_TOPIC_KEYWORDS.some((k) => topic.includes(k));
  const platforms = query.platforms;
  const found = platforms.reduce((s, p) => s + MOCK_CORPUS_COUNTS[p].found, 0);
  const analyzed = platforms.reduce((s, p) => s + MOCK_CORPUS_COUNTS[p].analyzed, 0);

  const narratives = !matchesTopic
    ? []
    : MOCK_NARRATIVES.map((n) => {
        const evidence = n.evidence.filter(
          (e) => e.platform !== null && platforms.includes(e.platform),
        );
        const ratio = evidence.length / n.evidence.length;
        return {
          ...n,
          evidence,
          supportingVideoCount: Math.max(
            evidence.length ? 1 : 0,
            Math.round(n.supportingVideoCount * ratio),
          ),
        };
      })
        .filter((n) => n.evidence.length > 0)
        .slice(0, 5);

  return {
    query,
    corpus: {
      videosFound: matchesTopic ? found : 0,
      videosAnalyzed: matchesTopic ? analyzed : 0,
      platforms,
      dateRange: query.dateRange,
    },
    narratives,
    mode: "mock",
  };
}

export function createMockNarrativeService(stepDelayMs = 650): NarrativeService {
  return {
    mode: "mock",
    async analyze(query: SearchQuery, options: AnalyzeOptions = {}) {
      const { onProgress, signal } = options;
      const emit = (e: ProgressEvent) => onProgress?.(e);
      const failing = query.topic.toLowerCase().includes("error");
      const total = query.platforms.reduce((s, p) => s + MOCK_CORPUS_COUNTS[p].analyzed, 0);

      for (const step of ANALYSIS_STEPS) {
        emit({ step: step.id, status: "active", processed: 0, total });
        await sleep(stepDelayMs / 2, signal);
        if (failing && step.id === ("extract" as StepId)) {
          emit({ step: step.id, status: "error", message: "Simulated failure" });
          throw new MockAnalysisError("The mock analysis failed (simulated error).");
        }
        emit({ step: step.id, status: "active", processed: Math.ceil(total / 2), total });
        await sleep(stepDelayMs / 2, signal);
        emit({ step: step.id, status: "done", processed: total, total });
      }
      return computeMockResult(query);
    },
  };
}
