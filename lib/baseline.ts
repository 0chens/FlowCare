import type { BaselineMetrics, DailyMetrics } from "./types";
import { shiftDate } from "./dates";
import { round } from "./format";

export function computeBaseline(history: DailyMetrics[], today: string): BaselineMetrics {
  const begin = shiftDate(today, -7);
  const days = history.filter(day => day.date >= begin && day.date < today && Number.isFinite(day.trackedMinutes) && day.trackedMinutes > 0);
  const average = (field: "trackedMinutes" | "productiveMinutes" | "distractingMinutes") =>
    days.length ? round(days.reduce((sum, day) => sum + day[field], 0) / days.length) : 0;
  return { days: days.length, sufficient: days.length >= 3, averageTrackedMinutes: average("trackedMinutes"),
    averageProductiveMinutes: average("productiveMinutes"), averageDistractingMinutes: average("distractingMinutes") };
}
