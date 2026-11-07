import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Index } from "@/routes/index";
import data from "@/lib/narrative/approved-demo.json";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("loads the real groups and separate observations and opens exact evidence without live requests", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<Index />);
  expect(screen.getByLabelText("Topic")).toHaveAttribute("readonly");
  fireEvent.click(screen.getByRole("button", { name: "View precomputed analysis" }));
  await screen.findByRole("heading", { name: data.narratives[0]!.title });
  expect(screen.getByRole("heading", { name: data.narratives[1]!.title })).toBeInTheDocument();
  expect(screen.getByText("2 narratives")).toBeInTheDocument();
  expect(screen.getAllByText(/outside quoted interval/)).toHaveLength(3);
  expect(screen.getAllByText(/of 5 represented videos support this group/)).toHaveLength(2);
  expect(
    screen.getByRole("heading", { name: "Individual observations · student housing" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Mock data")).not.toBeInTheDocument();
  const claim = data.claims.find((c) => c.id === "S03")!;
  fireEvent.click(
    screen.getByRole("button", {
      name: `Evidence from ${claim.creator.handle} on TikTok: ${claim.quote}`,
    }),
  );
  const drawer = await screen.findByRole("dialog");
  expect(within(drawer).getByText(claim.transcriptContext)).toBeInTheDocument();
  expect(within(drawer).getByText(claim.videoId)).toBeInTheDocument();
  expect(
    within(drawer).getByText(`${claim.startSeconds} – ${claim.endSeconds} s`),
  ).toBeInTheDocument();
  expect(within(drawer).getByRole("link", { name: /Open original video/ })).toHaveAttribute(
    "href",
    "https://www.tiktok.com/@grandebavardeuse/video/7684314552493722913",
  );
  expect(within(drawer).queryByText("Not available")).not.toBeInTheDocument();
  expect(
    within(drawer).getByText(`${claim.creator.displayName} (${claim.creator.handle})`),
  ).toBeInTheDocument();
  expect(within(drawer).getByRole("img")).toHaveAttribute("src", claim.frameUrl);
  expect(within(drawer).getByTitle("TikTok original video player")).toHaveAttribute(
    "loading",
    "lazy",
  );
  expect(fetch).not.toHaveBeenCalled();
});
it("opens an ungrouped approved proposal without calling it a narrative or an argument", async () => {
  render(<Index />);
  fireEvent.click(screen.getByRole("button", { name: "View precomputed analysis" }));
  const list = await screen.findByRole("list", { name: "Individual student-housing observations" });
  expect(within(list).getAllByRole("button")).toHaveLength(3);
  fireEvent.click(within(list).getAllByRole("button")[0]!);
  const drawer = await screen.findByRole("dialog");
  expect(
    within(drawer).getByRole("heading", { name: "Individual observation" }),
  ).toBeInTheDocument();
  expect(within(drawer).getByText("proposal · Human-approved claim")).toBeInTheDocument();
  expect(within(drawer).getByText("S01")).toBeInTheDocument();
});
