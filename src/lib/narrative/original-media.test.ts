import { expect, it } from "vitest";
import {
  VerifiedTikTokSourceSchema,
  verifiedOriginalMedia,
  originalVideoUrl,
} from "./original-media";
it("binds approved source IDs to distinct officially verified TikTok post IDs", () => {
  const media = verifiedOriginalMedia("cnt_356bd2866bc6b7f53e897a26ad82", "tiktok");
  expect(media).toEqual({
    tiktokPostId: "7685824397072026912",
    sourceUrl: "https://www.tiktok.com/@jeunesinsoumis/video/7685824397072026912",
  });
  expect(verifiedOriginalMedia("cnt_invented", "tiktok")).toEqual({});
  expect(verifiedOriginalMedia("cnt_356bd2866bc6b7f53e897a26ad82", "youtube")).toEqual({});
});
it("rejects internal IDs, mismatched posts and unsafe publication URLs", () => {
  const valid = {
    orianeId: "cnt_test",
    platform: "tiktok",
    tiktokPostId: "7685824397072026912",
    canonicalUrl: "https://www.tiktok.com/@jeunesinsoumis/video/7685824397072026912",
    verifiedBy: "official_oembed_and_player_link",
  };
  for (const patch of [
    { tiktokPostId: "cnt_fake" },
    { canonicalUrl: "https://evil.invalid/video/7685824397072026912" },
    { canonicalUrl: "https://www.tiktok.com/@x/video/7684314552493722913" },
    { canonicalUrl: "https://www.tiktok.com/@x/video/7685824397072026912?secret=1" },
    { canonicalUrl: "https://user:secret@www.tiktok.com/@x/video/7685824397072026912" },
  ])
    expect(VerifiedTikTokSourceSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  expect(VerifiedTikTokSourceSchema.safeParse(valid).success).toBe(true);
  expect(
    originalVideoUrl({
      platform: "tiktok",
      tiktokPostId: valid.tiktokPostId,
      sourceUrl: "https://evil.invalid",
    }),
  ).toBeUndefined();
});
