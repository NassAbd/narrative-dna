export function formatTime(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return null;
  const whole = Math.floor(sec);
  const fraction = String(sec).split(".")[1];
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}${fraction ? `.${fraction}` : ""}`;
}
export function formatRange(start: number | null, end: number | null): string | null {
  const a = formatTime(start),
    b = formatTime(end);
  if (!a && !b) return null;
  return `${a ?? "?"} – ${b ?? "?"}`;
}
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
