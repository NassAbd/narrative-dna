import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TikTokPlayer } from "@/components/narrative/TikTokPlayer";
const postId = "7685824397072026912";
function frame() {
  return screen.getByTitle("TikTok original video player") as HTMLIFrameElement;
}
function message(
  source: Window | null,
  origin = "https://www.tiktok.com",
  type = "onPlayerReady",
  value?: unknown,
) {
  act(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        source,
        origin,
        data: { "x-tiktok-player": true, type, value },
      }),
    ),
  );
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("uses the official lazy player without autoplay and rejects invalid source IDs", () => {
  const { rerender } = render(<TikTokPlayer postId={postId} startSec={62.4} />);
  expect(frame()).toHaveAttribute(
    "src",
    `https://www.tiktok.com/player/v1/${postId}?autoplay=0&controls=1&timestamp=1`,
  );
  expect(frame()).toHaveAttribute("loading", "lazy");
  expect(frame()).not.toHaveAttribute("allow", expect.stringContaining("autoplay"));
  rerender(<TikTokPlayer postId="cnt_not_a_tiktok_id" startSec={0} />);
  expect(screen.queryByTitle("TikTok original video player")).not.toBeInTheDocument();
});
it("accepts readiness only from the actual iframe and the exact official origin", () => {
  render(<TikTokPlayer postId={postId} startSec={62.4} />);
  message(frame().contentWindow, "https://evil.invalid");
  message(window);
  expect(screen.queryByRole("button", { name: /Jump to quoted time/ })).not.toBeInTheDocument();
  message(frame().contentWindow);
  expect(screen.getByText("TikTok player connected.")).toBeInTheDocument();
});
it("does not issue playback or seek commands even after a trusted readiness event", () => {
  render(<TikTokPlayer postId={postId} startSec={62.4} />);
  const playerWindow = frame().contentWindow!;
  const post = vi.spyOn(playerWindow, "postMessage").mockImplementation(() => {});
  message(playerWindow);
  expect(screen.getByText("TikTok player connected.")).toBeInTheDocument();
  expect(post).not.toHaveBeenCalled();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it("keeps source fallback guidance when TikTok reports unavailable playback", () => {
  render(<TikTokPlayer postId={postId} startSec={1} />);
  message(frame().contentWindow, "https://www.tiktok.com", "onPlayerError", {
    errorCode: 1001,
    errorType: "INVALID_VIDEO",
  });
  expect(screen.queryByTitle("TikTok original video player")).not.toBeInTheDocument();
  expect(screen.getByText(/TikTok could not play this video/)).toBeInTheDocument();
});
it("does not claim success or removal when no player handshake arrives", () => {
  vi.useFakeTimers();
  render(<TikTokPlayer postId={postId} startSec={null} />);
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByText(/Player connection has not been confirmed/)).toBeInTheDocument();
  expect(frame()).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Jump to quoted time/ })).not.toBeInTheDocument();
});
it("resets the player state for another source and keeps invalid timestamps unseekable", () => {
  const { rerender } = render(<TikTokPlayer postId={postId} startSec={1} />);
  message(frame().contentWindow);
  rerender(<TikTokPlayer postId="7684314552493722913" startSec={-1} />);
  expect(screen.queryByRole("button", { name: /Jump to quoted time/ })).not.toBeInTheDocument();
  message(frame().contentWindow);
  expect(screen.queryByRole("button", { name: /Jump to quoted time/ })).not.toBeInTheDocument();
});
