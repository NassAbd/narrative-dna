import type { EvidenceClip } from "@/lib/narrative";
import { EvidenceCard } from "./EvidenceCard";
export function IndividualObservations({
  clips,
  onOpen,
  live = false,
}: {
  live?: boolean;
  clips: EvidenceClip[];
  onOpen: (clip: EvidenceClip) => void;
}) {
  return (
    <section
      aria-labelledby={live ? "live-individual-observations" : "individual-observations"}
      className="mt-14 border-t border-foreground/80 pt-8"
    >
      <h2
        id={live ? "live-individual-observations" : "individual-observations"}
        className="font-serif text-3xl"
      >
        {live ? "Individual observations" : "Individual observations · student housing"}
      </h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        {live
          ? "AI-generated, source-verified observations awaiting editorial review. These are not narrative groups; original discourse types are preserved."
          : "Three approved claims from one source video. These are individual observations, not a third narrative. Their original discourse types are preserved."}
      </p>
      <div
        role="list"
        aria-label={live ? "Individual observations" : "Individual student-housing observations"}
        className="no-scrollbar -mx-6 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4"
      >
        {clips.map((clip) => (
          <div role="listitem" key={clip.id} className="flex">
            <EvidenceCard clip={clip} onOpen={() => onOpen(clip)} />
          </div>
        ))}
      </div>
    </section>
  );
}
