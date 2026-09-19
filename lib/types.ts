export interface ActivityItem {
  name: string;
  seconds: number;
  minutes: number;
  category?: string;
  productivity?: number;
}
export interface TimelinePoint {
  timestamp: string;
  minutes: number;
  productiveMinutes: number;
}
export interface TodayMetrics {
  trackedMinutes: number;
  productiveMinutes: number;
  distractingMinutes: number;
  neutralMinutes: number;
  topActivities: ActivityItem[];
  timeline: TimelinePoint[];
}
export interface DailyMetrics {
  date: string;
  trackedMinutes: number;
  productiveMinutes: number;
  distractingMinutes: number;
}
export interface BaselineMetrics {
  days: number;
  sufficient: boolean;
  averageTrackedMinutes: number;
  averageProductiveMinutes: number;
  averageDistractingMinutes: number;
}
export type WellnessState = "balanced" | "elevated_activity" | "extended_activity" | "low_activity" | "insufficient_data";
export interface WellnessAnalysis {
  state: WellnessState;
  balanceScore: number | null;
  activityVsBaseline: number | null;
  productiveVsBaseline: number | null;
  distractingVsBaseline: number | null;
  recentSustainedActivityMinutes: number;
  reasons: string[];
}
export interface AIInsight {
  headline: string;
  observation: string;
  recommendation: string;
  explanation: string;
}
export interface DashboardPayload {
  generatedAt: string;
  activityDate: string;
  timeZone: string;
  source: "rescuetime" | "mock";
  insightSource: "openai" | "fallback";
  today: TodayMetrics;
  baseline: BaselineMetrics;
  analysis: WellnessAnalysis;
  insight: AIInsight;
}
export interface RescueTimeResponse {
  notes: string;
  row_headers: string[];
  rows: unknown[][];
}
export interface ActivityBundle {
  interval: RescueTimeResponse;
  ranked: RescueTimeResponse;
  historical: RescueTimeResponse;
  todayDate: string;
  referenceTime: string;
  timeZone: string;
}
