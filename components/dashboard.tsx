"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, LayoutDashboard, RefreshCw, ShieldCheck, ArrowUpRight, WifiOff } from "lucide-react";
import type { DashboardPayload } from "@/lib/types";
import { Brand } from "./brand";
import { Hero } from "./hero";
import { MetricCards } from "./metric-cards";
import { InsightCard } from "./insight-card";
import { ActivityChart } from "./activity-chart";
import { TopActivities } from "./top-activities";
import { BaselineCard } from "./baseline-card";

function Loading() {
  return <div className="skeleton-layout" role="status" aria-label="Loading your activity"><span className="sr-only">Loading your activity</span><div className="skeleton skeleton-hero" /><div className="metrics-grid">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton skeleton-metric" />)}</div><div className="dashboard-grid"><div className="skeleton skeleton-panel" /><div className="skeleton skeleton-panel" /></div></div>;
}
export function Dashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [clock, setClock] = useState(0);
  const activeRequest = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController(); activeRequest.current = controller;

    try {
      const response = await fetch("/api/dashboard", { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Unavailable");
      const payload = await response.json() as DashboardPayload;
      if (!controller.signal.aborted) { setData(payload); setClock(Date.now()); }
    } catch { if (!controller.signal.aborted) setError(true); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  // This effect starts external I/O; state updates occur only after its response.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); return () => activeRequest.current?.abort(); }, [refresh]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const age = data ? Math.max(0, Math.floor((clock - Date.parse(data.generatedAt)) / 60000)) : 0;
  const date = data ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${data.activityDate}T12:00:00Z`)) : "Your daily overview";
  return <><a className="skip-link" href="#main">Skip to dashboard</a><header className="site-header"><div className="header-inner"><Brand /><div className="header-divider" /><span className="header-tagline">A little awareness. A better balance.</span><a className="privacy-link" href="#privacy"><ShieldCheck size={15} />Private by design<ArrowUpRight size={13} /></a></div></header>
    <div className="workspace-nav"><span><LayoutDashboard size={15} />Overview</span><div className="connection"><i />Powered by RescueTime</div></div>
    <main id="main" className="main-container"><div className="page-heading"><div><div className="eyebrow page-kicker">YOUR DAILY CHECK-IN</div><h1>Your digital activity, in context.</h1><p>A clearer picture of your day. A little more intention for what comes next.</p></div><div className="refresh-area"><span role="status">{loading ? "Updating your overview…" : data ? `Last updated ${age === 0 ? "just now" : `${age}m ago`}` : "Ready to connect"}</span><button className="refresh-button" onClick={() => { setLoading(true); setError(false); void refresh(); }} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} />Refresh</button></div></div>
      <div className="date-row"><span><CalendarDays size={14} />{date}</span><div>{data?.source === "mock" && <span className="demo-indicator"><i />Demo data</span>}<span className="date-context">{data?.source === "mock" ? "Afternoon snapshot · 3:30 pm" : data?.timeZone.replaceAll("_", " ")}</span></div></div>
      {error && <div className="error-state card" role="alert"><WifiOff size={27} /><h2>We couldn&apos;t retrieve your RescueTime activity.</h2><p>{data ? "Your previous snapshot is still shown below." : "Please check your connection and server configuration, then try again."}</p><button className="refresh-button" disabled={loading} onClick={() => { setLoading(true); setError(false); void refresh(); }}>Try again</button></div>}
      {!data && loading ? <Loading /> : data && <div aria-busy={loading}><Hero data={data} /><MetricCards data={data} /><div className="dashboard-grid"><div className="main-column"><InsightCard data={data} /><ActivityChart timeline={data.today.timeline} /></div><div className="side-column"><TopActivities activities={data.today.topActivities} /><BaselineCard data={data} /></div></div></div>}
      <section className="privacy-card" id="privacy"><span className="privacy-icon"><ShieldCheck size={21} /></span><div><h2>Privacy-first analysis</h2><p>FlowCare analyzes RescueTime activity metadata. Your RescueTime API key stays on the server, and the AI receives only summarized behavioral metrics.</p></div><span className="privacy-badge">Your patterns, respected.</span></section>
      <footer className="footer"><span>FlowCare<span className="brand-dot">.</span><span className="footer-tagline">Make room for life beyond the screen.</span></span><p>Digital awareness, not medical advice.</p></footer>
    </main></>;
}

