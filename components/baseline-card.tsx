import { ArrowUpRight, ArrowDownRight, Minus, ChartNoAxesCombined } from "lucide-react";
import type { DashboardPayload } from "@/lib/types";
import { formatMinutes, formatPercentDifference } from "@/lib/format";

export function BaselineCard({ data }: { data: DashboardPayload }) {
  const { baseline, analysis, today } = data;
  const rows = [
    { label: "Tracked activity", ratio: analysis.activityVsBaseline, current: today.trackedMinutes, normal: baseline.averageTrackedMinutes },
    { label: "Focus work", ratio: analysis.productiveVsBaseline, current: today.productiveMinutes, normal: baseline.averageProductiveMinutes },
    { label: "Personal activity", ratio: analysis.distractingVsBaseline, current: today.distractingMinutes, normal: baseline.averageDistractingMinutes },
  ];
  return <article className="card baseline-card"><div className="card-heading"><div><h2>Compared With Your Normal</h2><p className="card-subtitle">Your own pattern. Your own perspective.</p></div><ChartNoAxesCombined size={19} className="muted" /></div>
    <div className="comparison-list">{rows.map(row => {
      const Icon = row.ratio === null || row.ratio === 1 ? Minus : row.ratio > 1 ? ArrowUpRight : ArrowDownRight;
      return <div className="comparison-row" key={row.label}><div><span>{row.label}</span><p>{formatMinutes(row.current)} <span>vs.</span> {baseline.days ? formatMinutes(row.normal) : "—"}</p></div><span className={`comparison-pill ${row.ratio !== null && row.ratio < 1 ? "below" : ""}`}><Icon size={14} />{formatPercentDifference(row.ratio)}</span></div>;
    })}</div>
    <p className="baseline-note">Based on {baseline.days} tracked {baseline.days === 1 ? "day" : "days"} in the previous 7 complete calendar days. Today&apos;s partial total is compared with your full-day average.{!baseline.sufficient && " At least 3 tracked days are needed."}</p>
  </article>;
}

