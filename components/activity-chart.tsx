"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TimelinePoint } from "@/lib/types";
import { round } from "@/lib/format";

export function chartBuckets(timeline: TimelinePoint[]) {
  const buckets = new Map<number, { time: string; total: number; focus: number; other: number }>();
  for (const point of timeline) {
    const hour = Number(point.timestamp.slice(11, 13)), minute = Number(point.timestamp.slice(14, 16));
    const slot = hour * 2 + (minute >= 30 ? 1 : 0);
    const item = buckets.get(slot) ?? { time: `${String(hour).padStart(2, "0")}:${minute >= 30 ? "30" : "00"}`, total: 0, focus: 0, other: 0 };
    item.total += point.minutes; item.focus += point.productiveMinutes; item.other += Math.max(0, point.minutes - point.productiveMinutes);
    buckets.set(slot, item);
  }
  if (!buckets.size) return [];
  const start = Math.min(...buckets.keys()), end = Math.max(...buckets.keys());
  return Array.from({ length: end - start + 1 }, (_, i) => {
    const slot = start + i;
    const item = buckets.get(slot) ?? { time: `${String(Math.floor(slot / 2)).padStart(2, "0")}:${slot % 2 ? "30" : "00"}`, total: 0, focus: 0, other: 0 };
    return { ...item, total: round(item.total), focus: round(item.focus), other: round(item.other) };
  });
}
function timeLabel(value: string) { const hour = Number(value.slice(0, 2)); return `${hour % 12 || 12}${value.endsWith("30") ? ":30" : ""} ${hour < 12 ? "am" : "pm"}`; }
export function ActivityChart({ timeline }: { timeline: TimelinePoint[] }) {
  const data = chartBuckets(timeline);
  return <article className="card chart-card"><div className="card-heading"><div><h2>Activity Today</h2><p className="card-subtitle">Your day, one work block at a time.</p></div><span className="small-pill">30-min view</span></div>
    <div className="chart-legend"><span><i className="legend-focus" />Focus work</span><span><i className="legend-other" />Other activity</span></div>
    <p className="axis-caption">Minutes tracked</p>
    {data.length ? <div className="chart-container" role="img" aria-label="Stacked bar chart of tracked and productive activity in 30-minute intervals"><ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: -25, bottom: 0 }} barCategoryGap="33%" accessibilityLayer>
        <CartesianGrid vertical={false} stroke="#e9eeec" strokeDasharray="3 4" />
        <XAxis dataKey="time" axisLine={false} tickLine={false} tickFormatter={timeLabel} minTickGap={28} tick={{ fill: "#7c8783", fontSize: 11 }} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#7c8783", fontSize: 11 }} domain={[0, "auto"]} />
        <Tooltip cursor={{ fill: "#f0f5f2" }} labelFormatter={value => timeLabel(String(value))} formatter={(value, name) => [`${value ?? 0} min`, name === "focus" ? "Focus work" : "Other activity"]} contentStyle={{ border: "1px solid #e2e9e5", borderRadius: 12, fontSize: 12, boxShadow: "0 6px 25px #143a2410" }} />
        <Bar dataKey="focus" stackId="activity" fill="#398372" maxBarSize={26} />
        <Bar dataKey="other" stackId="activity" fill="#cfddd5" radius={[4, 4, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer></div> : <div className="chart-empty">Your timeline will appear after your first tracked activity.</div>}
    <div className="chart-footnote"><span className="status-dot" />Breaks are part of the picture, too.<span>Time of day</span></div>
  </article>;
}
