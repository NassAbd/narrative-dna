import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { EvidenceFrame } from "@/components/narrative/EvidenceCard";
import type { EvidenceClip } from "@/lib/narrative";
const clip: EvidenceClip = {
  id: "synthetic",
  videoId: "test-video",
  quote: "Citation",
  sourceType: "transcript",
  startSec: 1,
  endSec: 2,
  creator: null,
  platform: "tiktok",
  publishedAt: null,
  frameUrl: "https://social-catalog-static.oriane.xyz/test.webp",
  frameTimestampSec: 3,
};
afterEach(cleanup);
it("falls back when a public frame becomes unavailable and recovers for a new URL", () => {
  const { rerender } = render(<EvidenceFrame clip={clip} />);
  expect(screen.getByText(/outside quoted interval/)).toBeInTheDocument();
  const img = screen.getByRole("img");
  expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
  fireEvent.error(img);
  expect(screen.getByText("Frame unavailable")).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  rerender(
    <EvidenceFrame
      clip={{ ...clip, frameUrl: "https://social-catalog-static.oriane.xyz/other.webp" }}
    />,
  );
  expect(screen.getByRole("img")).toBeInTheDocument();
});
