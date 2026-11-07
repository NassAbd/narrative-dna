# Narrative DNA — Revised Plan

Desktop-first editorial tool revealing the specific arguments expressed in social videos about a topic, each traceable to a source video. MOCK mode only (housing in France), clearly labeled. No Oriane/OpenAI calls, auth, payments, database or API keys in the frontend.

## Design (unchanged)
Charcoal ink, warm off-white surfaces, restrained violet accents. Instrument Serif (claims, headlines), IBM Plex Sans (UI), IBM Plex Mono (timestamps, counts). Numbered narrative sections, thin rules, persistent "MOCK DATA" badge.

## Screens and states (single page at `/`)
1. **Search**: topic input, platform filter (TikTok default, Instagram, YouTube — driven by a config list), date presets (7d / 30d / 90d).
2. **Progress**: five stages — Collecting videos, Retrieving transcripts and evidence, Extracting arguments, Clustering narratives, Verifying evidence. Each shows status and "processed / total" counts when provided; no arbitrary percentages. A "Simulated progress (mock)" label in mock mode. Screen-reader live region.
3. **Results**: corpus strip — "Videos found: 42 · Videos analyzed: 30 · Platforms · Date range" plus a note: "Reflects analyzed videos only; not representative of public opinion." Then 0–5 narrative sections. Each title is a neutral, attributed argument (e.g. "Some renters argue that income requirements prevent them from accessing housing"), a short summary, and a count: "8 of 30 analyzed videos mention this argument." Horizontal keyboard/swipe carousel of evidence cards.
4. **Evidence card**: frame (or neutral placeholder when absent), French quote excerpt, timestamp or "Timestamp unavailable", source type tag (Transcript / On-screen text), creator, platform, date.
5. **Evidence drawer** (side sheet, bottom sheet on mobile): original French quote, transcript context, video metadata incl. video ID, start/end time, frame with its timestamp, source link only if `sourceUrl` exists. Missing fields show quiet "Not available" labels. No translation. Esc closes, focus restored.
6. **Idle, empty (0 narratives), and error states** with retry/reset.

## Data contracts (`src/lib/narrative/types.ts`)
```text
Platform = "tiktok" | "instagram" | "youtube"
SearchQuery { topic; platforms: Platform[]; dateRange: { from; to } }

EvidenceClip {
  id; videoId; quote; startSec: number|null; endSec: number|null;
  sourceType: "transcript" | "onScreenText"; transcriptContext?;
  creator { handle; displayName? }; platform; publishedAt;
  sourceUrl?; frameUrl?; frameTimestampSec?
}
Narrative { id; claim; summary; supportingVideoCount; evidence: EvidenceClip[] }
Corpus { videosFound; videosAnalyzed; platforms; dateRange }
AnalysisResult { query; corpus; narratives: Narrative[] (0–5); mode: "mock" | "live" }

StepId = collect | retrieve | extract | cluster | verify
ProgressEvent { step: StepId; status: pending|active|done|error; processed?; total?; message? }

NarrativeService {
  analyze(query, { onProgress(e: ProgressEvent), signal?: AbortSignal }): Promise<AnalysisResult>
}
```
A single video can appear in several narratives (same `videoId`, different clips).

## Future backend connection
```text
UI ──> NarrativeService (interface)
         ├─ mockNarrativeService   (now: mock-data.ts + simulated events)
         └─ liveNarrativeService   (later, by Codex: server function calling
                                    Oriane + OpenAI, streams ProgressEvents)
```
- Service chosen in one place (`src/lib/narrative/index.ts`); UI never imports mock data directly.
- Live implementation will run server-side (keys stay on the server) and stream the same `ProgressEvent` shape; UI needs no rewrite.

## Files
- `types.ts`, `mock-data.ts` (all fictional mock content, no invented URLs; some clips intentionally missing frames/timestamps), `mock-service.ts`, `platforms.ts`, `index.ts`.
- Components: SearchPanel, ProgressSteps, CorpusSummary, NarrativeSection, EvidenceCarousel, EvidenceCard, EvidenceDrawer, EmptyState, ErrorState.
- Tokens in `src/styles.css`, fonts via root head links, page metadata.
- Mock service triggers: topic containing "error" → error; "vide"/no matches → 0 narratives; platform filter changes narrative count.

## Tests (vitest)
Platform filtering; empty and error paths; variable narrative counts 0–5; same `videoId` across narratives; clips with missing optional fields render fallbacks; mock emits all five steps in order ending "done".
