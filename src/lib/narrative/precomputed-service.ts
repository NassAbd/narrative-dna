import data from "./approved-demo.json";
import { adaptValidatedPayload, PRECOMPUTED_QUERY } from "./validated-adapter";
import type { NarrativeService } from "./types";
export { PRECOMPUTED_QUERY };
export function createPrecomputedNarrativeService(): NarrativeService {
  return {
    mode: "precomputed",
    async analyze(query, options = {}) {
      if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (
        query.topic.trim().toLowerCase() !== PRECOMPUTED_QUERY.topic.toLowerCase() ||
        query.dateRange !== null ||
        query.platforms.length !== 1 ||
        query.platforms[0] !== "tiktok"
      )
        throw new Error(
          "Only the fixed precomputed housing analysis is available. Live search is not connected.",
        );
      options.onProgress?.({
        step: "verify",
        status: "active",
        message: "Loading approved precomputed evidence",
      });
      const result = adaptValidatedPayload(data);
      options.onProgress?.({ step: "verify", status: "done", processed: 9, total: 9 });
      return result;
    },
  };
}
