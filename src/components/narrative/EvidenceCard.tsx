import { forwardRef } from "react";
import { ImageOff } from "lucide-react";
import { platformLabel, type EvidenceClip } from "@/lib/narrative";
import { formatDate, formatRange } from "@/lib/narrative/format";

export function EvidenceFrame({ clip, large }: { clip: EvidenceClip; large?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-sm frame-bg ${large ? "aspect-video" : "aspect-[4/3]"}`}
    >
      {clip.frameUrl ? (
        <img
          src={clip.frameUrl}
          alt={`Frame from video ${clip.videoId}`}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-ink-muted">
          <ImageOff className="size-5" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-widest">Frame unavailable</span>
        </div>
      )}
      <span className="absolute left-2 top-2 rounded-sm bg-ink/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-foreground">
        {clip.platform ? platformLabel(clip.platform) : "Platform unavailable"}
      </span>
    </div>
  );
}

interface Props {
  clip: EvidenceClip;
  onOpen: () => void;
}

export const EvidenceCard = forwardRef<HTMLButtonElement, Props>(function EvidenceCard(
  { clip, onOpen },
  ref,
) {
  const range = formatRange(clip.startSec, clip.endSec);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      className="group flex w-[78vw] max-w-[300px] shrink-0 snap-start flex-col gap-3 rounded-md border border-border bg-card p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-[280px]"
      aria-label={`Evidence from ${clip.creator?.handle ?? "Creator unavailable"} on ${clip.platform ? platformLabel(clip.platform) : "Platform unavailable"}: ${clip.quote}`}
    >
      <EvidenceFrame clip={clip} />
      {clip.discourseType && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
          {clip.discourseType}
        </span>
      )}
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{clip.sourceType === "transcript" ? "Transcript" : "On-screen text"}</span>
        <span>{range ?? "Timestamp unavailable"}</span>
      </div>
      <blockquote lang="fr" className="line-clamp-4 font-serif text-lg leading-snug">
        « {clip.quote} »
      </blockquote>
      <div className="mt-auto border-t border-border pt-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {clip.creator?.handle ?? "Creator unavailable"}
        </span>{" "}
        · {formatDate(clip.publishedAt) ?? "Publication date unavailable"}
      </div>
    </button>
  );
});
