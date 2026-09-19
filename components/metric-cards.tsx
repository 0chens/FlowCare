import { ArrowUpRight, Clock3, Crosshair, Coffee, ChartNoAxesCombined } from "lucide-react";
import { formatMinutes, formatPercentDifference } from "@/lib/format";
import type { DashboardPayload } from "@/lib/types";

export function MetricCards({ data }: { data: DashboardPayload }) {
  const { today, analysis, baseline } = data;
  const cards = [
    { label: "Tracked today", value: formatMinutes(today.trackedMinutes), note: "A snapshot of your digital day", icon: Clock3, style: "teal" },
    { label: "Focus work", value: formatMinutes(today.productiveMinutes), note: "Activities rated productive", icon: Crosshair, style: "purple" },
    { label: "Personal / distracting", value: formatMinutes(today.distractingMinutes), note: "Time outside productive activity", icon: Coffee, style: "sand" },
    { label: "Compared with normal", value: formatPercentDifference(analysis.activityVsBaseline), note: baseline.sufficient ? "Against your full-day average" : "Building your personal baseline", icon: ChartNoAxesCombined, style: "blue" },
  ];
  return <section className="metrics-grid" aria-label="Today's activity metrics">{cards.map(({ label, value, note, icon: Icon, style }) => <article className="card metric-card" key={label}>
    <div className="metric-top"><span>{label}</span><span className={`icon-tile ${style}`}><Icon size={17} strokeWidth={1.7} /></span></div>
    <div className="metric-value">{value}{label === "Compared with normal" && analysis.activityVsBaseline !== null && analysis.activityVsBaseline > 1 && <ArrowUpRight size={23} />}</div>
    <p>{note}</p>
  </article>)}</section>;
}
