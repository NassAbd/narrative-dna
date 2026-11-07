import type { EvidenceClip } from "@/lib/narrative";
import { EvidenceCard } from "./EvidenceCard";
export function IndividualObservations({
  clips,
  onOpen,
}: {
  clips: EvidenceClip[];
  onOpen: (clip: EvidenceClip) => void;
}) {
  return (
    <section
      aria-labelledby="individual-observations"
      className="mt-14 border-t border-foreground/80 pt-8"
    >
      <h2 id="individual-observations" className="font-serif text-3xl">
        Individual observations · student housing
      </h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Three approved claims from one source video. These are individual observations, not a third
        narrative. Their original discourse types are preserved.
      </p>
      <div
        role="list"
        aria-label="Individual student-housing observations"
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
