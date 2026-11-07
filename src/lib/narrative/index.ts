// Production is always the approved precomputed analysis. Fictional development
// data is loaded only with an explicit development-only mode.
import { createPrecomputedNarrativeService } from "./precomputed-service";
import type { NarrativeService } from "./types";
const mockMode = import.meta.env.DEV && import.meta.env["VITE_NARRATIVE_MODE"] === "mock";
export const narrativeService: NarrativeService = mockMode
  ? {
      mode: "mock",
      async analyze(query, options) {
        const { createMockNarrativeService } = await import("./mock-service");
        return createMockNarrativeService().analyze(query, options);
      },
    }
  : createPrecomputedNarrativeService();
export { PRECOMPUTED_QUERY } from "./precomputed-service";
export * from "./types";
export { PLATFORMS, DEFAULT_PLATFORMS, platformLabel } from "./platforms";

export { createJuryClient } from "../jury/client";
