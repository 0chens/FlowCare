import { describe, expect, it } from "vitest";
import { formatMinutes, formatPercentDifference, safeDivide, clamp } from "../lib/format";
import { computeBaseline } from "../lib/baseline";
import { analyzeWellness } from "../lib/wellness";
import { estimateRecentActivity, normalizeHistory, normalizeToday, normalizeActivities, parseResponse } from "../lib/normalize";
import { mockRescueTime } from "../data/mock-rescuetime";
import type { BaselineMetrics, TodayMetrics } from "../lib/types";

const empty: TodayMetrics = { trackedMinutes: 0, productiveMinutes: 0, distractingMinutes: 0, neutralMinutes: 0, topActivities: [], timeline: [] };
const baseline: BaselineMetrics = { days: 7, sufficient: true, averageTrackedMinutes: 240, averageProductiveMinutes: 150, averageDistractingMinutes: 45 };
describe("formatting and arithmetic", () => {
  it("formats minutes and percentage differences", () => { expect(formatMinutes(122)).toBe("2h 02m"); expect(formatMinutes(59.9)).toBe("1h 00m"); expect(formatPercentDifference(1.29)).toBe("+29%"); expect(formatPercentDifference(null)).toBe("—"); });
  it("protects invalid denominators and clamps", () => { expect(safeDivide(10, 0)).toBeNull(); expect(safeDivide(Infinity, 2)).toBeNull(); expect(clamp(-10)).toBe(0); expect(clamp(120)).toBe(100); });
});
describe("header-driven normalization", () => {
  it("supports reordered columns, numeric strings, missing optional fields and malformed rows", () => {
    const rows = normalizeActivities(parseResponse({ row_headers: ["Activity", "Productivity", "Time Spent (seconds)"], rows: [["Code", "2", "120"], ["Bad", 0, -4], ["Missing"], ["Code", 2, 60]] }));
    expect(rows).toEqual([{ name: "Code", seconds: 180, minutes: 3, category: undefined, productivity: 2 }]);
  });
  it("rejects malformed envelopes and ambiguous headers", () => { expect(() => parseResponse({ rows: [] })).toThrow(); expect(() => parseResponse({ row_headers: ["Date", "date"], rows: [] })).toThrow(); });
  it("does not assume missing productivity is productive", () => {
    const table = parseResponse({ row_headers: ["Time Spent (seconds)", "Date"], rows: [[300, "2026-09-19T08:00:00"]] });
    const today = normalizeToday(table, { notes: "", row_headers: [], rows: [] });
    expect(today.trackedMinutes).toBe(5); expect(today.neutralMinutes).toBe(5); expect(today.productiveMinutes).toBe(0);
  });
});
describe("baseline and demo integration", () => {
  it("excludes today, old and untracked days", () => {
    const history = ["2026-09-11", "2026-09-12", "2026-09-18", "2026-09-19"].map(date => ({ date, trackedMinutes: 100, productiveMinutes: 60, distractingMinutes: 20 }));
    expect(computeBaseline(history, "2026-09-19")).toMatchObject({ days: 2, sufficient: false, averageTrackedMinutes: 100 });
  });
  it("runs the same pipeline for mock tables and produces the requested demo", () => {
    const raw = mockRescueTime(new Date("2026-09-19T19:30:00Z"));
    const today = normalizeToday(raw.interval, raw.ranked);
    const normal = computeBaseline(normalizeHistory(raw.historical), raw.todayDate);
    const sustained = estimateRecentActivity(today.timeline, raw.referenceTime);
    expect(today).toMatchObject({ trackedMinutes: 310, productiveMinutes: 205, distractingMinutes: 40, neutralMinutes: 65 });
    expect(today.topActivities.reduce((sum, a) => sum + a.minutes, 0)).toBe(310);
    expect(normal).toEqual(baseline); expect(sustained).toBe(105);
    expect(analyzeWellness(today, normal, sustained)).toMatchObject({ state: "extended_activity", balanceScore: 65, activityVsBaseline: 1.292 });
  });
});
describe("deterministic wellness", () => {
  it.each([[276, 90, "extended_activity"], [312, 20, "elevated_activity"], [144, 20, "low_activity"], [240, 30, "balanced"]] as const)("classifies %s tracked / %s sustained as %s", (tracked, recent, state) => {
    expect(analyzeWellness({ ...empty, trackedMinutes: tracked }, baseline, recent).state).toBe(state);
  });
  it("does not invent scores or ratios without a usable baseline", () => { expect(analyzeWellness(empty, { ...baseline, days: 2 }, 0)).toMatchObject({ state: "insufficient_data", balanceScore: null, activityVsBaseline: null }); expect(analyzeWellness(empty, { ...baseline, averageTrackedMinutes: 0 }, 0).balanceScore).toBeNull(); });
  it("handles a zero productive baseline", () => { expect(analyzeWellness(empty, { ...baseline, averageProductiveMinutes: 0 }, 0).productiveVsBaseline).toBeNull(); });
});
describe("sustained activity estimate", () => {
  const point = (time: string, minutes = 5) => ({ timestamp: `2026-09-19T${time}:00`, minutes, productiveMinutes: minutes });
  it("stops at gaps and ignores stale sessions", () => { const points = [point("09:00"), point("09:10"), point("09:15")]; expect(estimateRecentActivity(points, "2026-09-19T09:20:00")).toBe(10); expect(estimateRecentActivity(points, "2026-09-19T12:00:00")).toBe(0); });
  it("does not bridge empty buckets or double-count overlapping apps", () => { expect(estimateRecentActivity([point("09:00"), point("09:05", 0), point("09:10", 10)], "2026-09-19T09:15:00")).toBe(5); });
});
