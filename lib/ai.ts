import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { AIInsight, BaselineMetrics, TodayMetrics, WellnessAnalysis, WellnessState } from "./types";
import { formatMinutes, formatPercentDifference } from "./format";

const recommendations: Record<WellnessState, { headline: string; recommendation: string }> = {
  balanced: { headline: "A familiar rhythm", recommendation: "Keep a little space between work blocks for a short screen-free pause." },
  extended_activity: { headline: "A little space goes a long way", recommendation: "Consider stepping away from the screen for a few minutes before starting your next work block." },
  elevated_activity: { headline: "A fuller digital day", recommendation: "Choose a natural stopping point and make room for a short screen-free break." },
  low_activity: { headline: "A quieter digital day", recommendation: "Let today's priorities guide your screen time. There is no need to match your average." },
  insufficient_data: { headline: "Getting to know your rhythm", recommendation: "Keep RescueTime running while you go about your day. Your personal baseline will take shape over time." },
};
export function fallbackInsight(today: TodayMetrics, analysis: WellnessAnalysis): AIInsight {
  if (today.trackedMinutes === 0) return { headline: "A fresh start", observation: "No computer activity has been recorded today yet.", recommendation: "Check back after your next work block, once RescueTime has synced." };
  return { ...recommendations[analysis.state], observation: analysis.activityVsBaseline === null
    ? `You've tracked ${formatMinutes(today.trackedMinutes)} today. There isn't enough recent history for a reliable comparison yet.`
    : `Your tracked activity is ${formatPercentDifference(analysis.activityVsBaseline)} versus your recent full-day average, with approximately ${analysis.recentSustainedActivityMinutes} minutes of recent sustained activity.` };
}
const InsightSchema = z.object({ headline: z.string(), observation: z.string(), recommendation: z.string() });
const SYSTEM = `You are FlowCare, a digital wellness assistant. You receive structured behavioral metrics describing computer activity.
Generate a short headline, one factual observation, and one practical low-risk recommendation. Never diagnose medical or psychological conditions.
Do not state or imply that computer activity proves stress, burnout, ADHD, depression, anxiety, disease, sleep deprivation, or another medical condition. Never make alarming claims.
Ground the observation strictly in supplied metrics. The state and score are already determined: do not determine, reinterpret, or change them.
The baseline is a full-day average, not an elapsed-time projection. Sustained activity is an application-derived interval estimate, not an exact session and has no historical session baseline.
Prefer wording such as 'higher than your usual pattern', 'sustained computer activity', 'consider taking a short break'. Do not claim sessions are longer than typical because historical session lengths are unavailable.
Recommendations must be easy, non-medical, and optional. Low activity is not a problem to correct. Keep the total response under 85 words.`;

export async function createInsight(today: TodayMetrics, baseline: BaselineMetrics, analysis: WellnessAnalysis): Promise<{ insight: AIInsight; insightSource: "openai" | "fallback" }> {
  const fallback = { insight: fallbackInsight(today, analysis), insightSource: "fallback" as const };
  if (!process.env.OPENAI_API_KEY || today.trackedMinutes === 0) return fallback;
  // Explicit allowlist: never spread today or include app names, titles, URLs,
  // provider categories (which can be custom), or raw history in the model input.
  const summary = {
    state: analysis.state, balanceScore: analysis.balanceScore, trackedMinutesToday: today.trackedMinutes,
    baselineTrackedMinutes: baseline.averageTrackedMinutes, usableBaselineDays: baseline.days,
    activityVsBaseline: analysis.activityVsBaseline, productiveVsBaseline: analysis.productiveVsBaseline,
    recentSustainedActivityMinutes: analysis.recentSustainedActivityMinutes,
  };
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 12000, maxRetries: 0 });
    const response = await client.responses.parse({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", store: false,
      input: [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(summary) }],
      text: { format: zodTextFormat(InsightSchema, "flowcare_insight") }, max_output_tokens: 300 });
    const insight = response.output_parsed;
    if (!insight || Object.values(insight).some(value => !value.trim() || value.length > 600)) return fallback;
    // Defense in depth, not a claim of perfect semantic safety. Reject medical
    // language, links, and diagnostic framing in addition to the system contract.
    if (/burn.?out|\badhd\b|depress|anxiety|stress|disease|sleep.depriv|diagnos|unhealthy|danger|\brisk\b|https?:|www\./i.test(Object.values(insight).join(" "))) return fallback;
    return { insight, insightSource: "openai" };
  } catch { return fallback; }
}
