import { ChevronDown, Sparkles, ArrowUpRight } from "lucide-react";
import type { DashboardPayload } from "@/lib/types";
import { formatMinutes, formatPercentDifference } from "@/lib/format";

export function InsightCard({ data }: { data: DashboardPayload }) {
  const rows = [
    ["Today's tracked activity", formatMinutes(data.today.trackedMinutes)],
    ["Typical full-day amount", data.baseline.days ? formatMinutes(data.baseline.averageTrackedMinutes) : "Learning"],
    ["Difference", formatPercentDifference(data.analysis.activityVsBaseline)],
    ["Recent sustained activity", `~${formatMinutes(data.analysis.recentSustainedActivityMinutes)}`],
  ];
  return <article className="card insight-card"><div className="card-heading"><span className="eyebrow"><Sparkles size={15} /> AI INSIGHT</span><span className="small-pill">{data.insightSource === "openai" ? "Personalized for you" : "Built-in guidance"}</span></div>
    <h2>{data.insight.headline}</h2><p className="insight-observation">{data.insight.observation}</p>
    <div className="recommendation"><span className="recommendation-icon"><ArrowUpRight size={19} /></span><div><span className="eyebrow">A SMALL NEXT STEP</span><p>{data.insight.recommendation}</p></div></div>
    <details className="explanation"><summary>Why am I seeing this?<ChevronDown size={16} /></summary><div className="explanation-content"><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>Sustained activity is estimated from consecutive populated intervals, not an exact continuous session. Today is compared with complete days, not the same time of day.</p><ul>{data.analysis.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div></details>
  </article>;
}
