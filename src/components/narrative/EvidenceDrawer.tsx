import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { platformLabel, type EvidenceClip, type Narrative } from "@/lib/narrative";
import { formatDate, formatRange } from "@/lib/narrative/format";
import { EvidenceFrame } from "./EvidenceCard";

interface Props {
  clip: EvidenceClip | null;
  narrative: Narrative | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm">
      <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          value ? "min-w-0 break-all text-right" : "text-right italic text-muted-foreground"
        }
      >
        {value ?? "Not available"}
      </dd>
    </div>
  );
}

export function EvidenceDrawer({ clip, narrative, onClose }: Props) {
  const mobile = useIsMobile();
  return (
    <Sheet open={!!clip} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={mobile ? "bottom" : "right"}
        className="max-h-[92vh] sm:max-h-none w-full overflow-y-auto bg-background sm:max-w-lg"
      >
        {clip && (
          <>
            <SheetHeader className="text-left">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                Evidence ·{" "}
                {clip.provenance === "precomputed" ? "real Oriane data · precomputed" : "mock data"}
              </p>
              <SheetTitle className="font-serif text-xl font-normal leading-snug">
                {narrative?.claim ?? "Individual observation"}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Source details for this quotation
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-8">
              {clip.formulation && (
                <p lang="fr" className="text-sm leading-relaxed">
                  {clip.formulation}
                </p>
              )}
              {clip.discourseType && (
                <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
                  {clip.discourseType} ·{" "}
                  {clip.provenance === "precomputed" ? "Human-approved claim" : "Fictional example"}
                </p>
              )}
              <blockquote
                lang="fr"
                className="border-l-2 border-primary pl-4 font-serif text-2xl leading-snug"
              >
                « {clip.quote} »
              </blockquote>
              <div>
                <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Transcript context
                </h3>
                {clip.transcriptContext ? (
                  <p lang="fr" className="rounded-sm bg-muted p-3 text-sm leading-relaxed">
                    {clip.transcriptContext}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    No surrounding context available.
                  </p>
                )}
              </div>
              <div>
                <EvidenceFrame clip={clip} large />
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {clip.frameUrl
                    ? `Exact frame time: ${clip.frameTimestampSec} s`
                    : "Frame timestamp not provided"}
                </p>
              </div>
              <dl>
                <Row
                  label="Creator"
                  value={
                    clip.creator?.displayName
                      ? `${clip.creator.displayName} (${clip.creator.handle})`
                      : clip.creator?.handle
                  }
                />
                <Row label="Platform" value={clip.platform ? platformLabel(clip.platform) : null} />
                <Row label="Published" value={formatDate(clip.publishedAt)} />
                <Row label="Time range" value={formatRange(clip.startSec, clip.endSec)} />
                <Row
                  label="Source type"
                  value={clip.sourceType === "transcript" ? "Transcript" : "On-screen text"}
                />
                <Row label="Claim ID" value={clip.id} />
                <Row
                  label="Exact seconds"
                  value={
                    clip.startSec !== null && clip.endSec !== null
                      ? `${clip.startSec} – ${clip.endSec} s`
                      : null
                  }
                />
                <Row label="Video ID" value={clip.videoId} />
              </dl>
              {clip.sourceUrl ? (
                <a
                  href={clip.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                >
                  Open original video <ExternalLink className="size-4" />
                </a>
              ) : (
                <p className="text-sm italic text-muted-foreground">Original link not provided.</p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
