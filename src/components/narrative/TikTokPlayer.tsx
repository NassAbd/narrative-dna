import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/narrative/format";

interface Props {
  /** The caller must bind this platform ID to a verified original source. */
  postId: string;
  startSec: number | null;
}
type PlayerStatus = "loading" | "ready" | "unconfirmed" | "error";
const ORIGIN = "https://www.tiktok.com";

/** Mount only when its evidence drawer is open. No automatic playback or seeking. */
export function TikTokPlayer({ postId, startSec }: Props) {
  if (!/^\d{17,20}$/.test(postId))
    return (
      <p className="text-sm text-muted-foreground">
        Original player unavailable: invalid source identifier.
      </p>
    );
  return <VerifiedPlayer key={postId} postId={postId} startSec={startSec} />;
}

function VerifiedPlayer({ postId, startSec }: Props) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<PlayerStatus>("loading");
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setStatus((current) => (current === "loading" ? "unconfirmed" : current)),
      12000,
    );
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== ORIGIN ||
        !iframe.current ||
        event.source !== iframe.current.contentWindow
      )
        return;
      const data = event.data;
      if (
        !data ||
        typeof data !== "object" ||
        !("x-tiktok-player" in data) ||
        data["x-tiktok-player"] !== true ||
        !("type" in data)
      )
        return;
      if (data.type === "onPlayerReady") {
        window.clearTimeout(timeout);
        setStatus("ready");
      } else if (data.type === "onPlayerError" || data.type === "onError") {
        window.clearTimeout(timeout);
        setStatus("error");
      }
    };
    window.addEventListener("message", receive);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
    };
  }, []);
  const quotedTime = formatTime(startSec);
  return (
    <section aria-label="Original TikTok video" className="space-y-2">
      <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Original video · official TikTok player
      </h3>
      {status !== "error" && (
        <iframe
          ref={iframe}
          title="TikTok original video player"
          src={`${ORIGIN}/player/v1/${postId}?autoplay=0&controls=1&timestamp=1`}
          className="aspect-video w-full rounded-sm border-0 bg-ink"
          loading="lazy"
          allow="fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setStatus("error")}
        />
      )}
      <p role="status" className="text-xs text-muted-foreground">
        {status === "error"
          ? "TikTok could not play this video. The verified source frame and quotation remain available below."
          : status === "unconfirmed"
            ? "Player connection has not been confirmed. If TikTok is blocked or stays blank, use the source frame and quotation below."
            : status === "ready"
              ? "TikTok player connected."
              : "Connecting to TikTok. Playback does not start automatically."}
      </p>
      {quotedTime && (
        <p className="text-xs text-muted-foreground">
          Quoted passage starts at {quotedTime}. Use the player's controls to navigate.
        </p>
      )}
    </section>
  );
}
