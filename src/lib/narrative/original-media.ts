import { z } from "zod";
import verifiedData from "./verified-original-media.json";
import type { Platform } from "./types";
export function validTikTokPostId(id: unknown): id is string {
  return typeof id === "string" && /^\d{17,20}$/.test(id);
}
function validCanonical(url: string, postId: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === "www.tiktok.com" &&
      !u.port &&
      !u.username &&
      !u.password &&
      !u.search &&
      !u.hash &&
      new RegExp(`^/@[a-zA-Z0-9._]+/video/${postId}$`).test(u.pathname)
    );
  } catch {
    return false;
  }
}
export const VerifiedTikTokSourceSchema = z
  .object({
    orianeId: z.string().startsWith("cnt_"),
    platform: z.literal("tiktok"),
    tiktokPostId: z.string().refine(validTikTokPostId),
    canonicalUrl: z.string().url(),
    verifiedBy: z.literal("official_oembed_and_player_link"),
  })
  .strict()
  .refine(
    (v) => validCanonical(v.canonicalUrl, v.tiktokPostId),
    "Publication must match the verified TikTok post",
  );
const sources = z.array(VerifiedTikTokSourceSchema).parse(verifiedData);
export function verifiedOriginalMedia(
  videoId: string,
  platform: Platform | null,
): { tiktokPostId?: string; sourceUrl?: string } {
  const source = platform === "tiktok" ? sources.find((s) => s.orianeId === videoId) : undefined;
  return source ? { tiktokPostId: source.tiktokPostId, sourceUrl: source.canonicalUrl } : {};
}
export function originalVideoUrl(clip: {
  platform: Platform | null;
  tiktokPostId?: string;
  sourceUrl?: string;
}): string | undefined {
  return clip.platform === "tiktok" &&
    validTikTokPostId(clip.tiktokPostId) &&
    clip.sourceUrl &&
    validCanonical(clip.sourceUrl, clip.tiktokPostId)
    ? clip.sourceUrl
    : undefined;
}
