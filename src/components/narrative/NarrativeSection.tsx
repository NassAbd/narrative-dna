import { useRef, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EvidenceClip, Narrative } from "@/lib/narrative";
import { EvidenceCard } from "./EvidenceCard";

interface Props {
  narrative: Narrative;
  index: number;
  videosAnalyzed: number;
  onOpen: (clip: EvidenceClip, narrative: Narrative) => void;
}

export function NarrativeSection({ narrative, index, videosAnalyzed, onOpen }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  const onKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (next == null) return;
    e.preventDefault();
    cards.current[Math.max(0, Math.min(next, narrative.evidence.length - 1))]?.focus();
  };

  const titleId = `narrative-${narrative.id}`;
  return (
    <section aria-labelledby={titleId} className="border-t border-foreground/80 pt-8">
      <div className="grid gap-6 md:grid-cols-[80px_1fr_auto]">
        <span className="font-serif text-5xl italic text-primary" aria-hidden>
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="max-w-3xl">
          <h2 id={titleId} className="font-serif text-3xl leading-tight md:text-[2.4rem]">
            {narrative.claim}
          </h2>
          <p className="mt-3 line-clamp-2 max-w-2xl text-muted-foreground">{narrative.summary}</p>
          <p className="mt-4 font-mono text-xs uppercase tracking-wider">
            <span className="text-primary">{narrative.supportingVideoCount}</span> of{" "}
            {videosAnalyzed} represented videos support this group
          </p>
        </div>
        <div className="hidden items-start gap-2 md:flex">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Scroll evidence left"
            className="rounded-full border border-border p-2 hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Scroll evidence right"
            className="rounded-full border border-border p-2 hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div
        ref={track}
        role="list"
        aria-label={`Evidence for: ${narrative.claim}`}
        className="no-scrollbar -mx-6 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 md:ml-[104px] md:mx-0 md:px-0"
      >
        {narrative.evidence.map((clip, i) => (
          <div role="listitem" key={clip.id} onKeyDown={(e) => onKey(e, i)} className="flex">
            <EvidenceCard
              ref={(el) => {
                cards.current[i] = el;
              }}
              clip={clip}
              onOpen={() => onOpen(clip, narrative)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
