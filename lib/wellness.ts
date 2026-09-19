import type { BaselineMetrics, TodayMetrics, WellnessAnalysis, WellnessState } from "./types";
import { clamp, formatPercentDifference, round, safeDivide } from "./format";

export function analyzeWellness(today: TodayMetrics, baseline: BaselineMetrics, sustained: number): WellnessAnalysis {
  const activity = safeDivide(today.trackedMinutes, baseline.averageTrackedMinutes);
  const enough = baseline.days >= 3 && activity !== null;
  const ratio = (a: number, b: number) => { const value = safeDivide(a, b); return enough && value !== null ? round(value, 3) : null; };
  const recent = Math.max(0, Number.isFinite(sustained) ? sustained : 0);
  let state: WellnessState = "insufficient_data";
  let score: number | null = null;
  const reasons: string[] = [];
  // Product heuristics for digital activity, NOT medical thresholds or a diagnosis.
  // Compare today's partial total with the recent full-day mean (not time-adjusted).
  if (enough) {
    if (recent >= 90 && activity >= 1.15) state = "extended_activity";
    else if (activity >= 1.30) state = "elevated_activity";
    else if (activity <= 0.60) state = "low_activity";
    else state = "balanced";
    score = 100;
    if (activity > 1.1) score -= 10;
    if (activity > 1.3) score -= 15;
    if (activity < 0.6) score -= 15;
    if (recent > 60) score -= 10;
    if (recent > 90) score -= 15;
    score = clamp(score);
    reasons.push(`Today's tracked total is ${formatPercentDifference(activity)} compared with your recent full-day average.`);
  } else reasons.push("At least three tracked days in the previous seven complete days are needed for a baseline.");
  reasons.push(`Recent sustained activity is estimated at ${Math.round(recent)} minutes from consecutive populated intervals.`);
  return { state, balanceScore: score, activityVsBaseline: enough ? round(activity, 3) : null,
    productiveVsBaseline: ratio(today.productiveMinutes, baseline.averageProductiveMinutes),
    distractingVsBaseline: ratio(today.distractingMinutes, baseline.averageDistractingMinutes),
    recentSustainedActivityMinutes: recent, reasons };
}
