import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const DEMO_STEPS = [
  "Searching video evidence",
  "Extracting arguments",
  "Grouping narratives",
  "Connecting source evidence",
] as const;

/** Presentational walkthrough shown while the approved precomputed analysis loads. */
export function DemoWorkflow({ current }: { current: number }) {
  return (
    <section aria-labelledby="demo-title" className="mx-auto max-w-2xl py-16">
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="demo-title" className="font-serif text-3xl">
          Loading precomputed analysis
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
          Demonstration of the analysis workflow
        </span>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        No live Oriane or OpenAI requests are made. These steps illustrate how the approved results
        were produced.
      </p>
      <p className="sr-only" aria-live="polite">
        {DEMO_STEPS[current] ? `${DEMO_STEPS[current]}…` : ""}
      </p>
      <ol className="divide-y divide-border border-y border-border">
        {DEMO_STEPS.map((label, i) => {
          const status = i < current ? "done" : i === current ? "active" : "pending";
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-4 py-4 transition-opacity duration-500 motion-reduce:transition-none",
                status === "pending" && "opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs transition-colors duration-300 motion-reduce:transition-none",
                  status === "done" && "border-primary bg-primary text-primary-foreground",
                  status === "active" && "border-primary text-primary",
                  status === "pending" && "border-border text-muted-foreground",
                )}
                aria-hidden
              >
                {status === "done" ? (
                  <Check className="size-4" />
                ) : status === "active" ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  i + 1
                )}
              </span>
              <span className={cn("flex-1", status === "pending" && "text-muted-foreground")}>
                {label}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {status === "done" ? "Done" : status === "active" ? "In progress" : "Pending"}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 h-0.5 overflow-hidden rounded-full bg-border" aria-hidden>
        <div
          className="h-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${(Math.min(current, DEMO_STEPS.length) / DEMO_STEPS.length) * 100}%` }}
        />
      </div>
    </section>
  );
}
