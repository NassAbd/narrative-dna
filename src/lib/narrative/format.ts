export function formatTime(sec: number | null | undefined): string | null {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatRange(start: number | null, end: number | null): string | null {
  const a = formatTime(start);
  const b = formatTime(end);
  if (!a && !b) return null;
  return `${a ?? "?"} – ${b ?? "?"}`;
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
