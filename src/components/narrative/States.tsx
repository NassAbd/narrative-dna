import { AlertTriangle, SearchX } from "lucide-react";
import { platformLabel, type AnalysisMode, type Corpus } from "@/lib/narrative";
import { formatDate } from "@/lib/narrative/format";

export function CorpusSummary({ corpus, mode }: { corpus: Corpus; mode: AnalysisMode }) {
  const items = [
    [mode === "precomputed" ? "Source videos" : "Videos found", String(corpus.videosFound)],
    [
      mode === "precomputed" ? "Approved claims" : "Videos analyzed",
      String(mode === "precomputed" ? corpus.approvedClaimCount : corpus.videosAnalyzed),
    ],
    ["Platforms", corpus.platforms.map(platformLabel).join(", ") || "Not provided"],
    ...(mode === "precomputed"
      ? []
      : [
          [
            "Period",
            corpus.dateRange
              ? `${formatDate(corpus.dateRange.from)} – ${formatDate(corpus.dateRange.to)}`
              : "Not provided",
          ],
        ]),
  ];
  return (
    <div className="mb-12">
      <dl
        className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-4"
        style={
          mode === "precomputed" ? { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" } : undefined
        }
      >
        {items.map(([k, val]) => (
          <div key={k} className="bg-card p-4">
            <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {k}
            </dt>
            <dd className="mt-1 font-serif text-2xl">{val}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">
        {mode === "precomputed"
          ? "Approved evidence only — not a representative sample of public opinion."
          : "Reflects analyzed videos only; not representative of public opinion."}
        {mode === "mock" && " All content shown is fictional mock data."}
      </p>
    </div>
  );
}

export function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden />
      <h2 className="mt-4 font-serif text-3xl">No narratives identified</h2>
      <p className="mt-2 text-muted-foreground">
        No supported arguments were found for this topic, platforms and period. Try another topic or
        widen the filters.
      </p>
      <button
        onClick={onReset}
        className="mt-6 rounded-md border border-border px-5 py-2 hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        Reset search
      </button>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg py-20 text-center">
      <AlertTriangle className="mx-auto size-8 text-destructive" aria-hidden />
      <h2 className="mt-4 font-serif text-3xl">Analysis interrupted</h2>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 rounded-md bg-primary px-5 py-2 text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Try again
      </button>
    </div>
  );
}
