// Single place where the UI's NarrativeService is chosen.
// Later: swap for a live implementation (server function calling Oriane + OpenAI)
// that emits the same ProgressEvent shape.
import { createMockNarrativeService } from "./mock-service";
import type { NarrativeService } from "./types";

export const narrativeService: NarrativeService = createMockNarrativeService();

export * from "./types";
export { PLATFORMS, DEFAULT_PLATFORMS, platformLabel } from "./platforms";
