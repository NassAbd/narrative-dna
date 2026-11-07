import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createJuryClient,
  type AnalysisResult,
  type EvidenceClip,
  type Narrative,
  type ProgressEvent,
  type StepId,
} from "@/lib/narrative";
type JurySession = Awaited<ReturnType<ReturnType<typeof createJuryClient>["session"]>>;
import { SearchPanel } from "./SearchPanel";
import { ProgressSteps } from "./ProgressSteps";
import { NarrativeSection } from "./NarrativeSection";
import { IndividualObservations } from "./IndividualObservations";

type Phase = { kind: "idle" | "running" } | { kind: "done"; result: AnalysisResult };
export function JuryLivePanel({
  onOpen,
}: {
  onOpen: (clip: EvidenceClip, narrative: Narrative | null) => void;
}) {
  const [client] = useState(() => createJuryClient());
  const [session, setSession] = useState<JurySession | null>(null);
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [events, setEvents] = useState<Partial<Record<StepId, ProgressEvent>>>({});
  const busy = useRef(false);
  const progress = (e: ProgressEvent) => setEvents((cur) => ({ ...cur, [e.step]: e }));
  const report = (e: unknown) =>
    setError(e instanceof Error ? e.message : "Jury Live is unavailable.");
  useEffect(() => {
    let mounted = true;
    void client
      .session()
      .then(async (s) => {
        if (!mounted) return;
        setSession(s);
        if (s.authenticated && s.activeJobId) {
          busy.current = true;
          setPhase({ kind: "running" });
          try {
            const result = await client.resume(s.activeJobId, { onProgress: progress });
            if (mounted) setPhase({ kind: "done", result });
          } catch (e) {
            if (mounted) {
              report(e);
              setPhase({ kind: "idle" });
            }
          } finally {
            busy.current = false;
            if (mounted) void client.session().then(setSession).catch(report);
          }
        }
      })
      .catch(() => {
        if (mounted) setSession({ available: false, authenticated: false });
      });
    return () => {
      mounted = false;
    };
  }, [client]);
  async function login(e: FormEvent) {
    e.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setError("");
    const submitted = password;
    setPassword("");
    try {
      setSession(await client.login(submitted));
    } catch (e) {
      report(e);
    } finally {
      setAuthBusy(false);
    }
  }
  async function analyze(topic: string) {
    if (busy.current) return;
    busy.current = true;
    setError("");
    setEvents({});
    setPhase({ kind: "running" });
    try {
      const result = await client.analyze(
        { topic, platforms: ["tiktok"], language: "fr", dateRange: null },
        { onProgress: progress },
      );
      setPhase({ kind: "done", result });
    } catch (e) {
      report(e);
      setPhase({ kind: "idle" });
    } finally {
      busy.current = false;
      try {
        setSession(await client.session());
      } catch {
        setSession({ available: false, authenticated: false });
      }
    }
  }
  if (!session)
    return (
      <p role="status" className="py-12 text-muted-foreground">
        Checking secure jury access…
      </p>
    );
  if (!session.available)
    return (
      <section className="max-w-2xl py-12">
        <h1 className="font-serif text-4xl">Jury Live</h1>
        <p role="status" className="mt-4 text-muted-foreground">
          Jury Live is currently unavailable. Explore remains available with the approved,
          precomputed evidence.
        </p>
      </section>
    );
  return (
    <section className="space-y-8">
      {!session.authenticated ? (
        <div className="max-w-md py-8">
          <p className="font-mono text-xs uppercase tracking-wider text-primary">
            Private hackathon access
          </p>
          <h1 className="mt-3 font-serif text-4xl">Unlock Jury Live</h1>
          <p className="mt-4 text-muted-foreground">
            Use the password provided privately by the project owner. Live analysis uses a shared,
            limited quota.
          </p>
          <form onSubmit={login} className="mt-6 space-y-4">
            <label htmlFor="jury-password" className="block text-sm">
              Jury password
            </label>
            <input
              id="jury-password"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-card p-3"
            />
            <button
              disabled={authBusy || !password}
              className="rounded-md bg-primary px-6 py-3 text-primary-foreground disabled:opacity-50"
            >
              {authBusy ? "Checking…" : "Unlock Jury Live"}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-xs uppercase tracking-wider">
              {session.remaining ?? "—"} / 10 new analyses remaining globally
            </p>
            <button
              type="button"
              disabled={phase.kind === "running"}
              onClick={() => {
                void client
                  .logout()
                  .then(() => {
                    setSession({ available: true, authenticated: false });
                    setPhase({ kind: "idle" });
                    setError("");
                  })
                  .catch(report);
              }}
              className="text-sm underline disabled:opacity-50"
            >
              Log out
            </button>
          </div>
          <div className="rounded-lg bg-ink p-6 text-ink-foreground">
            <SearchPanel
              initialTopic=""
              initialPlatforms={["tiktok"]}
              live
              busy={phase.kind === "running"}
              onSubmit={(q) => void analyze(q.topic)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            French TikTok · up to 10 videos · no date filter. Failed or cancelled analyses retain
            their reserved quota. Completed matching queries use the cache without new provider
            calls. This sample does not represent public opinion.
          </p>
          {phase.kind === "running" && (
            <>
              <ProgressSteps events={events} mode="live" />
              <button
                type="button"
                className="text-sm underline"
                onClick={() => void client.cancel().catch(report)}
              >
                Request cancellation
              </button>
              <p className="text-sm text-muted-foreground">
                Progress reflects saved backend milestones. You can refresh to reconnect to the
                active job.
              </p>
            </>
          )}
          {phase.kind === "done" && <LiveResult result={phase.result} onOpen={onOpen} />}
        </>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-destructive p-4 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
const warningMessages: Record<string, string> = {
  clustering_skipped_input_limit:
    "Grouping was skipped to stay within the model input budget. Source-verified individual observations are shown instead.",
  oriane_partial_response:
    "Oriane returned partial results; this analysis uses only the evidence received.",
  source_metadata_incomplete: "Some source metadata was unavailable or invalid.",
  transcript_truncated:
    "Long transcripts were shortened before analysis; original timestamps were preserved.",
  passage_limit: "Some transcripts exceeded the bounded analysis size and were omitted.",
  rejected_claim: "Some proposed claims failed source or semantic checks and were excluded.",
  rejected_source_reference: "Unsupported source references were excluded.",
  unsupported_group_wording_rejected:
    "A proposed narrative failed grounding checks. Its verified clips remain as individual observations.",
  invalid_group_references_rejected:
    "A proposed narrative had invalid source references and was excluded.",
  insufficient_group_support_rejected:
    "A proposed narrative lacked independent video support and was excluded.",
};
function LiveResult({
  result,
  onOpen,
}: {
  result: AnalysisResult;
  onOpen: (clip: EvidenceClip, narrative: Narrative | null) => void;
}) {
  const c = result.counts;
  const m = result.metrics;
  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-primary">
          {result.cached ? "Cached live" : "Live AI-generated"}
        </p>
        <h1 className="mt-3 font-serif text-4xl">“{result.query.topic}”</h1>
        <p className="mt-4 rounded-md border border-border bg-card p-4 font-mono text-xs">
          AI-GENERATED · SOURCE-VERIFIED · NOT EDITORIALLY REVIEWED
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Exact source matching does not guarantee semantic accuracy. Review each quotation and its
          context before publication.
        </p>
      </div>
      {c && (
        <p className="text-sm text-muted-foreground">
          {c.resultsFound ?? "Unknown"} provider matches · {c.uniqueVideosRetained} unique retained
          · {c.relevantVideos} relevant · {c.videosAnalyzed} analyzed ·{" "}
          {c.videosContributingEvidence} contributing evidence
        </p>
      )}
      {m && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">
            Processing diagnostics · {(m.totalMs / 1000).toFixed(1)} s
          </summary>
          <p className="mt-2">
            Oriane {m.orianeMs} ms · normalization {m.normalizationMs} ms · extraction{" "}
            {m.extractionMs} ms · grouping {m.clusteringMs} ms · verification {m.verificationMs} ms
          </p>
          <p>
            {m.inputTokens} input / {m.outputTokens} output tokens · estimated OpenAI $
            {m.estimatedOpenaiUsd.toFixed(4)} · {m.estimatedOrianeCredits} estimated Oriane credits
            reserved, actual billing unconfirmed.{" "}
            {result.cached ? "These are the original cached execution metrics." : ""}
          </p>
        </details>
      )}
      {result.warnings
        ?.filter((w) => warningMessages[w])
        .map((w, i) => (
          <p key={i} className="text-sm text-muted-foreground">
            {warningMessages[w]}
          </p>
        ))}
      {result.narratives.length === 0 && (
        <p className="rounded-md border border-border p-5">
          Insufficient evidence for a multi-source narrative. Any source-verified individual
          observations appear below.
        </p>
      )}
      {result.narratives.map((n, i) => (
        <NarrativeSection
          key={n.id}
          narrative={n}
          index={i}
          videosAnalyzed={result.corpus.videosAnalyzed}
          onOpen={onOpen}
        />
      ))}
      {!!result.individualObservations?.length && (
        <IndividualObservations
          live
          clips={result.individualObservations}
          onOpen={(c) => onOpen(c, null)}
        />
      )}
    </div>
  );
}
