import { ArrowUpRight, Leaf } from "lucide-react";
import type { DashboardPayload, WellnessState } from "@/lib/types";

const copy: Record<WellnessState, { title: string; detail: string; label: string }> = {
  extended_activity: { title: "A full day. A little room to reset.", detail: "Your activity is above your usual pattern today. A small pause could be a good way to start your next chapter.", label: "Above baseline" },
  elevated_activity: { title: "A little more screen time today.", detail: "Your tracked activity is higher than your recent full-day average. Make space for a pause when it works for you.", label: "Above baseline" },
  balanced: { title: "You're finding your familiar rhythm.", detail: "Your digital activity is close to your recent pattern. Keep making room for the things that matter to you.", label: "Near baseline" },
  low_activity: { title: "A little more room beyond the screen.", detail: "Your activity so far is below your recent full-day average. Every day has its own pace, and today is still unfolding.", label: "Below baseline" },
  insufficient_data: { title: "We're learning your normal activity pattern.", detail: "Keep RescueTime running and we'll build your baseline from your recent activity.", label: "Getting to know you" },
};
export function Hero({ data }: { data: DashboardPayload }) {
  const state = copy[data.analysis.state];
  const score = data.analysis.balanceScore;
  const empty = data.today.trackedMinutes === 0;
  return <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><span className="eyebrow"><Leaf size={14} /> A LITTLE PERSPECTIVE</span>
    <h2 id="hero-title">{empty ? "Your day is a blank canvas." : state.title}</h2>
    <p>{empty ? "No activity recorded yet. Your digital day will appear here once RescueTime syncs your next work block." : state.detail}</p>
    <span className="hero-tag"><span className="status-dot" />{empty ? "Ready when you are" : state.label}{!empty && data.analysis.activityVsBaseline !== null && data.analysis.activityVsBaseline > 1 && <ArrowUpRight size={13} />}</span>
  </div><div className="balance"><div className="balance-ring" role="img" aria-label={`Digital Balance: ${score ?? "not available"}${score === null ? "" : " out of 100"}`}>
    <svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="68" className="ring-track" /><circle cx="80" cy="80" r="68" className="ring-value" strokeDasharray={`${(score ?? 0) * 4.2726} 427.26`} /></svg>
    <div className="ring-label"><strong>{score ?? "—"}</strong><span>{score === null ? "Learning" : "/ 100"}</span></div>
  </div><h3>Digital Balance</h3><p>Activity in context, not a health score</p></div></section>;
}
