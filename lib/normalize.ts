import type { ActivityItem, DailyMetrics, RescueTimeResponse, TimelinePoint, TodayMetrics } from "./types";
import { round } from "./format";
import { wallTimeMs } from "./dates";

type Row = Record<string, unknown>;
const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function parseResponse(value: unknown): RescueTimeResponse {
  if (!value || typeof value !== "object") throw new Error("Invalid activity response");
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.row_headers) || !data.row_headers.every((h): h is string => typeof h === "string") ||
      !Array.isArray(data.rows) || !data.rows.every(Array.isArray)) throw new Error("Invalid activity table");
  if (new Set(data.row_headers.map(key)).size !== data.row_headers.length) throw new Error("Ambiguous activity columns");
  return { notes: typeof data.notes === "string" ? data.notes : "", row_headers: data.row_headers, rows: data.rows };
}

// Keep unknown values unknown until a field parser validates them; no generic cast
// can legitimately promise that an external table already matches an app type.
export function rowsToObjects(headers: readonly string[], rows: readonly unknown[][]): Row[] {
  return rows.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}
function objects(data: RescueTimeResponse): Row[] {
  return rowsToObjects(data.row_headers.map(key), data.rows);
}
function numeric(value: unknown): number | undefined {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function seconds(row: Row): number | undefined {
  const value = numeric(row.timespentseconds ?? row.timespent ?? row.seconds);
  return value !== undefined && value >= 0 ? value : undefined;
}
function productivity(row: Row): number | undefined {
  const value = numeric(row.productivity);
  return value !== undefined && Number.isInteger(value) && value >= -2 && value <= 2 ? value : undefined;
}
function timestamp(row: Row): string | undefined {
  const value = text(row.date ?? row.timestamp);
  if (!value) return undefined;
  const full = value.length === 10 ? `${value}T00:00:00` : value.replace(" ", "T");
  return Number.isFinite(wallTimeMs(full)) ? full : undefined;
}
function requireColumns(data: RescueTimeResponse, time = false) {
  if (!data.rows.length) return;
  const headers = data.row_headers.map(key);
  if (!headers.some(h => ["timespentseconds", "timespent", "seconds"].includes(h)) ||
    (time && !headers.some(h => ["date", "timestamp"].includes(h)))) throw new Error("Missing required activity columns");
}
export function normalizeActivities(data: RescueTimeResponse): ActivityItem[] {
  requireColumns(data);
  const items = new Map<string, ActivityItem>();
  for (const row of objects(data)) {
    const name = text(row.activity ?? row.name);
    const duration = seconds(row);
    if (!name || duration === undefined || duration === 0) continue;
    const existing = items.get(name);
    if (existing) { existing.seconds += duration; existing.minutes = round(existing.seconds / 60); }
    else items.set(name, { name, seconds: duration, minutes: round(duration / 60), category: text(row.category), productivity: productivity(row) });
  }
  return [...items.values()].sort((a, b) => b.seconds - a.seconds);
}
export function normalizeToday(interval: RescueTimeResponse, ranked: RescueTimeResponse): TodayMetrics {
  requireColumns(interval, true);
  const timeline = new Map<string, TimelinePoint>();
  let tracked = 0, productive = 0, distracting = 0;
  for (const row of objects(interval)) {
    const date = timestamp(row), duration = seconds(row);
    if (!date || duration === undefined) continue;
    const minutes = duration / 60, rating = productivity(row) ?? 0;
    tracked += minutes;
    if (rating > 0) productive += minutes;
    if (rating < 0) distracting += minutes;
    const point = timeline.get(date) ?? { timestamp: date, minutes: 0, productiveMinutes: 0 };
    point.minutes += minutes;
    if (rating > 0) point.productiveMinutes += minutes;
    timeline.set(date, point);
  }
  return {
    trackedMinutes: round(tracked), productiveMinutes: round(productive), distractingMinutes: round(distracting),
    neutralMinutes: round(Math.max(0, tracked - productive - distracting)), topActivities: normalizeActivities(ranked).slice(0, 8),
    timeline: [...timeline.values()].sort((a, b) => wallTimeMs(a.timestamp) - wallTimeMs(b.timestamp))
      .map(p => ({ ...p, minutes: round(p.minutes), productiveMinutes: round(p.productiveMinutes) })),
  };
}
export function normalizeHistory(data: RescueTimeResponse): DailyMetrics[] {
  requireColumns(data, true);
  const days = new Map<string, DailyMetrics>();
  for (const row of objects(data)) {
    const date = timestamp(row)?.slice(0, 10), duration = seconds(row);
    if (!date || duration === undefined) continue;
    const day = days.get(date) ?? { date, trackedMinutes: 0, productiveMinutes: 0, distractingMinutes: 0 };
    const minutes = duration / 60, rating = productivity(row) ?? 0;
    day.trackedMinutes += minutes;
    if (rating > 0) day.productiveMinutes += minutes;
    if (rating < 0) day.distractingMinutes += minutes;
    days.set(date, day);
  }
  return [...days.values()];
}

export function estimateRecentActivity(points: TimelinePoint[], referenceTime: string): number {
  const ordered = [...points].sort((a, b) => wallTimeMs(a.timestamp) - wallTimeMs(b.timestamp));
  // The documented "minute" resolution is five minutes. Infer finer returned
  // spacing if available, but never mistake a missing-data gap for a large bucket.
  const gaps = ordered.slice(1).map((p, i) => (wallTimeMs(p.timestamp) - wallTimeMs(ordered[i]!.timestamp)) / 60000).filter(g => g > 0);
  const bucket = Math.min(5, ...gaps);
  const recent = ordered.filter(p => wallTimeMs(p.timestamp) <= wallTimeMs(referenceTime));
  const last = recent.at(-1);
  if (!last || last.minutes <= 0 || wallTimeMs(referenceTime) - wallTimeMs(last.timestamp) > (bucket * 2 + 2) * 60000) return 0;
  let total = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const point = recent[i]!;
    if (point.minutes <= 0) break;
    const next = recent[i + 1];
    if (next && wallTimeMs(next.timestamp) - wallTimeMs(point.timestamp) > bucket * 60000 + 1000) break;
    total += Math.min(bucket, point.minutes);
  }
  return Math.round(total);
}
