import { Check, Loader2, X } from "lucide-react";
import { ANALYSIS_STEPS, type ProgressEvent, type StepId } from "@/lib/narrative";
import { cn } from "@/lib/utils";

interface Props {
  events: Partial<Record<StepId, ProgressEvent>>;
  mode: "mock" | "live";
}

export function ProgressSteps({ events, mode }: Props) {
  const active = ANALYSIS_STEPS.find((s) => events[s.id]?.status === "active");
  return (
    <section aria-labelledby="progress-title" className="mx-auto max-w-2xl py-16">
      <div className="mb-8 flex items-baseline justify-between">
        <h2 id="progress-title" className="font-serif text-3xl">Analysis in progress</h2>
        {mode === "mock" && (
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Simulated progress · mock</span>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{active ? `${active.label}…` : ""}</p>
      <ol className="divide-y divide-border border-y border-border">
        {ANALYSIS_STEPS.map((s, i) => {
          const e = events[s.id];
          const status = e?.status ?? "pending";
          return (
            <li key={s.id} className="flex items-center gap-4 py-4">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                  status === "done" && "border-primary bg-primary text-primary-foreground",
                  status === "active" && "border-primary text-primary",
                  status === "error" && "border-destructive bg-destructive text-destructive-foreground",
                  status === "pending" && "border-border text-muted-foreground",
                )}
                aria-hidden
              >
                {status === "done" ? <Check className="size-4" /> : status === "active" ? <Loader2 className="size-4 animate-spin" /> : status === "error" ? <X className="size-4" /> : i + 1}
              </span>
              <span className={cn("flex-1", status === "pending" && "text-muted-foreground")}>{s.label}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {e?.total != null && status !== "pending" ? `${e.processed ?? 0} / ${e.total}` : status === "pending" ? "Pending" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
