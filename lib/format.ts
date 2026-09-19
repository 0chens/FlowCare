export function clamp(value: number, min = 0, max = 100): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}
export function safeDivide(numerator: number, denominator: number): number | null {
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator : null;
}
export function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
export function formatMinutes(value: number): string {
  const minutes = Math.round(Math.max(0, Number.isFinite(value) ? value : 0));
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
export function formatPercentDifference(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—";
  const value = Math.round((ratio - 1) * 100);
  return `${value > 0 ? "+" : ""}${value}%`;
}
