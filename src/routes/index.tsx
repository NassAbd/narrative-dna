import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_PLATFORMS,
  PRECOMPUTED_QUERY,
  narrativeService,
  type AnalysisResult,
  type EvidenceClip,
  type Narrative,
  type SearchQuery,
} from "@/lib/narrative";
import { DemoWorkflow, DEMO_STEPS } from "@/components/narrative/DemoWorkflow";
import { SearchPanel } from "@/components/narrative/SearchPanel";
import { NarrativeSection } from "@/components/narrative/NarrativeSection";
import { IndividualObservations } from "@/components/narrative/IndividualObservations";
import { EvidenceDrawer } from "@/components/narrative/EvidenceDrawer";
import { CorpusSummary, EmptyState, ErrorState } from "@/components/narrative/States";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Narrative DNA — Evidence-backed narratives in social video" },
      {
        name: "description",
        content:
          "Reveal the specific arguments expressed in TikTok, Instagram and YouTube videos, each traced to source evidence.",
      },
      { property: "og:title", content: "Narrative DNA" },
      {
        property: "og:description",
        content: "Evidence-backed narrative analysis of social videos for journalists.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Phase =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; result: AnalysisResult }
  | { kind: "error"; message: string };

export function Index() {
  const precomputed = narrativeService.mode === "precomputed";
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [demoStep, setDemoStep] = useState(0);
  const [open, setOpen] = useState<{ clip: EvidenceClip; narrative: Narrative | null } | null>(
    null,
  );
  const lastQuery = useRef<SearchQuery | null>(null);
  const abort = useRef<AbortController | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(
    () => () => {
      clearTimers();
      abort.current?.abort();
    },
    [],
  );
  const wait = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve) => {
      if (signal.aborted || ms <= 0) return resolve();
      timers.current.push(setTimeout(resolve, ms));
    });

  const run = async (q: SearchQuery) => {
    if (phase.kind === "running") return;
    abort.current?.abort();
    clearTimers();
    const ctrl = new AbortController();
    abort.current = ctrl;
    lastQuery.current = q;
    setDemoStep(0);
    setPhase({ kind: "running" });
    try {
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const stepMs = import.meta.env.MODE === "test" ? 0 : reduced ? 450 : 850;
      const loading = narrativeService.analyze(q, { signal: ctrl.signal });
      for (let i = 1; i <= DEMO_STEPS.length; i++) {
        await wait(stepMs, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setDemoStep(i);
      }
      const result = await loading;
      if (ctrl.signal.aborted) return;
      setPhase({ kind: "done", result });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setPhase({ kind: "error", message: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-ink-foreground">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-6">
          <div className="mb-12 flex items-center justify-between border-b border-ink-border pb-4">
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-2xl">
                Narrative <em className="text-accent">DNA</em>
              </span>
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted sm:inline">
                Editorial intelligence
              </span>
            </div>
            <span className="rounded-sm border border-primary px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              {precomputed ? "Real data · precomputed" : "Mock data"}
            </span>
          </div>
          <div>
            <SearchPanel
              initialTopic="Logement en France"
              initialPlatforms={precomputed ? PRECOMPUTED_QUERY.platforms : DEFAULT_PLATFORMS}
              precomputed={precomputed}
              busy={phase.kind === "running"}
              onSubmit={run}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div>
          {phase.kind === "idle" && (
            <div className="max-w-2xl py-12">
              <h1 className="font-serif text-5xl leading-tight">
                Which arguments are people making — and where is the proof?
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                {precomputed
                  ? "Explore the narratives inside social videos. Verify every insight against its source."
                  : 'Narrative DNA groups the specific claims, experiences and viewpoints expressed in social videos, and ties every one of them to a quotation from a source video. Try a topic such as "Loyers à Paris", or "error" to preview a failure.'}
              </p>
            </div>
          )}
          {phase.kind === "running" && <DemoWorkflow current={demoStep} />}
          {phase.kind === "error" && (
            <ErrorState
              message={phase.message}
              onRetry={() => lastQuery.current && run(lastQuery.current)}
            />
          )}
          {phase.kind === "done" && (
            <>
              <div className="mb-6 flex items-baseline justify-between gap-4">
                <h1 className="font-serif text-4xl">“{phase.result.query.topic}”</h1>
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {phase.result.narratives.length} narrative
                  {phase.result.narratives.length === 1 ? "" : "s"}
                </span>
              </div>
              {phase.result.mode === "precomputed" && (
                <p className="mb-6 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
                  Precomputed · 9 human-approved claims · narrative summaries are editorial drafts.
                </p>
              )}
              <CorpusSummary corpus={phase.result.corpus} mode={phase.result.mode} />
              {phase.result.narratives.length === 0 ? (
                <EmptyState onReset={() => setPhase({ kind: "idle" })} />
              ) : (
                <div className="space-y-14">
                  {phase.result.narratives.map((n, i) => (
                    <NarrativeSection
                      key={n.id}
                      narrative={n}
                      index={i}
                      videosAnalyzed={phase.result.corpus.videosAnalyzed}
                      onOpen={(clip, narrative) => setOpen({ clip, narrative })}
                    />
                  ))}
                </div>
              )}
              {!!phase.result.individualObservations?.length && (
                <IndividualObservations
                  clips={phase.result.individualObservations}
                  onOpen={(clip) => setOpen({ clip, narrative: null })}
                />
              )}
            </>
          )}
        </div>
      </main>

      <footer className="mx-auto max-w-6xl border-t border-border px-6 py-6 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {precomputed
          ? "Real Oriane evidence · precomputed analysis · missing metadata is not reconstructed"
          : "Mock mode · fictional creators and quotations · no source links are invented"}
      </footer>

      <EvidenceDrawer
        clip={open?.clip ?? null}
        narrative={open?.narrative ?? null}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}
