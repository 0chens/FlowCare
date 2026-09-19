import "server-only";
import { mockRescueTime } from "../data/mock-rescuetime";
import { fetchRescueTime } from "./rescuetime";
import { estimateRecentActivity, normalizeHistory, normalizeToday } from "./normalize";
import { computeBaseline } from "./baseline";
import { analyzeWellness } from "./wellness";
import { createInsight } from "./ai";
import type { DashboardPayload } from "./types";

export async function buildDashboard(): Promise<DashboardPayload> {
  const now = new Date();
  const mock = (process.env.USE_MOCK_DATA ?? "true").toLowerCase() === "true";
  const raw = mock ? mockRescueTime(now) : await fetchRescueTime(now);
  const today = normalizeToday(raw.interval, raw.ranked);
  const baseline = computeBaseline(normalizeHistory(raw.historical), raw.todayDate);
  const analysis = analyzeWellness(today, baseline, estimateRecentActivity(today.timeline, raw.referenceTime));
  const explanation = await createInsight(today, baseline, analysis);
  return { generatedAt: new Date().toISOString(), activityDate: raw.todayDate, timeZone: raw.timeZone,
    source: mock ? "mock" : "rescuetime", today, baseline, analysis, ...explanation };
}
