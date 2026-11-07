# Narrative DNA — Plan

A desktop-first editorial intelligence tool showing the narratives in social videos about a topic, each backed by video evidence. All data is clearly labeled MOCK (housing in France). No external calls, auth, payments or database.

## Design direction
- Premium investigative newsroom: charcoal ink (dark header/drawer), warm off-white paper surfaces, restrained violet accent for focus, active states and claim markers.
- Typography: Instrument Serif (headlines, narrative claims) + IBM Plex Sans (UI) + IBM Plex Mono (timestamps, metadata).
- Strong hierarchy, thin rules, numbered narrative sections, a persistent "MOCK DATA" badge.

## Screens and states (single page at `/`)
1. **Search bar**: topic input (prefilled "Logement en France"), platform multi-select (TikTok, YouTube, Instagram, X), date range presets (7d / 30d / 90d / custom), Analyze button.
2. **Progress state**: real sequential steps driven by the mock service: Collecting videos → Transcribing → Extracting claims → Clustering narratives → Verifying evidence. Each shows pending / active / done, plus a progress bar; screen-reader live region.
3. **Results**: summary strip (videos analyzed, narratives, date span, platforms), then 4 narrative sections. Each has a precise argumentative claim as title (e.g. "Airbnb-style short-term rentals are the main cause of rent increases in Paris"), short synthesis, prevalence and stance chips, and a horizontal scroll-snap carousel of 3–5 evidence cards (keyboard arrows + prev/next buttons, swipeable on mobile).
4. **Evidence card**: stylized frame placeholder (generated gradient + time overlay, no real thumbnails), quote excerpt, creator handle, platform, date.
5. **Evidence drawer** (side sheet; bottom sheet on mobile): larger frame, full literal quote (French original + English translation), time range, creator, platform, publish date, a "Source URL unavailable — mock data" note instead of any link. Esc closes, focus is trapped and restored.
6. **Empty state** (no narratives for the filters, e.g. topic with no match) and **error state** (simulated failure, e.g. topic containing "error"), each with a retry/reset action. Initial idle state with example topics.

## Technical details
- `src/lib/narrative/types.ts`: `Platform`, `SearchQuery`, `AnalysisStep`, `StepStatus`, `EvidenceClip` (id, quote, quoteTranslation, startSec, endSec, creator, platform, publishedAt, frame descriptor), `Narrative` (id, claim, summary, stance, prevalence, evidence[]), `AnalysisResult`.
- `src/lib/narrative/mock-data.ts`: the single replaceable module holding all MOCK French housing data (fictional creators, no URLs).
- `src/lib/narrative/service.ts`: typed `NarrativeService` interface + `mockNarrativeService.analyze(query, onStep)` with simulated step delays, platform/date filtering, empty and error paths. Swapping to a real API means implementing the same interface.
- Components in `src/components/narrative/`: SearchPanel, ProgressSteps, NarrativeSection, EvidenceCarousel, EvidenceCard, EvidenceDrawer (shadcn Sheet), EmptyState, ErrorState.
- Design tokens in `src/styles.css` (oklch), fonts via `<link>` in root head; route head metadata updated.
- Small vitest tests for the service: filtering by platform, empty result, error path, each narrative has 3–5 clips.
