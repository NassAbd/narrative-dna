import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { PLATFORMS, type Platform, type SearchQuery } from "@/lib/narrative";
import { cn } from "@/lib/utils";

const PRESETS = [7, 30, 90] as const;

function rangeFor(days: number) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return { from: f(from), to: f(to) };
}

interface Props {
  initialTopic: string;
  initialPlatforms: Platform[];
  busy: boolean;
  onSubmit: (q: SearchQuery) => void;
}

export function SearchPanel({ initialTopic, initialPlatforms, busy, onSubmit }: Props) {
  const [topic, setTopic] = useState(initialTopic);
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [days, setDays] = useState<number>(30);

  const toggle = (p: Platform) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || platforms.length === 0) return;
    onSubmit({ topic: topic.trim(), platforms, dateRange: rangeFor(days) });
  };

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end" aria-label="Analyze a topic">
      <div className="space-y-2">
        <label htmlFor="topic" className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
          Topic
        </label>
        <div className="flex items-center gap-3 border-b border-ink-border pb-2 focus-within:border-primary">
          <Search className="size-5 text-ink-muted" aria-hidden />
          <input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-transparent font-serif text-3xl text-ink-foreground outline-none placeholder:text-ink-muted md:text-4xl"
            placeholder="e.g. Logement en France"
          />
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3 pt-3">
          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">Platforms</legend>
            <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted" aria-hidden>
              Platforms
            </span>
            {PLATFORMS.map((p) => {
              const on = platforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-ink-border text-ink-muted hover:text-ink-foreground",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </fieldset>
          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">Date range</legend>
            <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted" aria-hidden>
              Period
            </span>
            {PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={days === d}
                onClick={() => setDays(d)}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  days === d
                    ? "border-ink-foreground text-ink-foreground"
                    : "border-ink-border text-ink-muted hover:text-ink-foreground",
                )}
              >
                {d} days
              </button>
            ))}
          </fieldset>
        </div>
        {platforms.length === 0 && <p className="text-sm text-ink-muted">Select at least one platform.</p>}
      </div>
      <button
        type="submit"
        disabled={busy || !topic.trim() || platforms.length === 0}
        className="h-12 rounded-md bg-primary px-7 font-medium text-primary-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
      >
        {busy ? "Analyzing…" : "Analyze narratives"}
      </button>
    </form>
  );
}
