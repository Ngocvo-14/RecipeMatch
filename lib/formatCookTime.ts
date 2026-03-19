export function formatCookTime(minutes: number | null | undefined): string {
  if (!minutes) return '~30m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
