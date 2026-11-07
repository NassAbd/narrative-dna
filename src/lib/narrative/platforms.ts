import type { Platform } from "./types";

export interface PlatformConfig {
  id: Platform;
  label: string;
  short: string;
}

/** Platforms documented by the Oriane API. Add entries here to extend filters. */
export const PLATFORMS: PlatformConfig[] = [
  { id: "tiktok", label: "TikTok", short: "TT" },
  { id: "instagram", label: "Instagram", short: "IG" },
  { id: "youtube", label: "YouTube", short: "YT" },
];

export const DEFAULT_PLATFORMS: Platform[] = ["tiktok"];

export function platformLabel(p: Platform): string {
  return PLATFORMS.find((x) => x.id === p)?.label ?? p;
}
