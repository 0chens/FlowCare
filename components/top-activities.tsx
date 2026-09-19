import { Code2, Globe, PenTool, MessageSquare, FileText, AppWindow } from "lucide-react";
import type { ActivityItem } from "@/lib/types";
import { formatMinutes } from "@/lib/format";
const icons = { "Visual Studio Code": Code2, Chrome: Globe, Figma: PenTool, Slack: MessageSquare, Notion: FileText };
export function TopActivities({ activities }: { activities: ActivityItem[] }) {
  const max = Math.max(1, ...activities.map(a => a.minutes));
  return <article className="card activities-card"><div className="card-heading"><div><h2>Top Activities</h2><p className="card-subtitle">Where your attention went.</p></div><span className="small-pill">Today</span></div>
    <div className="activity-list">{activities.length ? activities.slice(0, 5).map((activity, i) => {
      const Icon = icons[activity.name as keyof typeof icons] ?? AppWindow;
      return <div className="activity-row" key={activity.name}><span className={`app-icon app-${i}`}><Icon size={19} strokeWidth={1.7} /></span><div className="activity-info"><div><span title={activity.name}>{activity.name}</span><strong>{formatMinutes(activity.minutes)}</strong></div><div className="progress-track"><div style={{ width: `${activity.minutes / max * 100}%` }} /></div></div></div>;
    }) : <p className="muted">Your apps and websites will appear here once activity is available.</p>}</div>
    <p className="activities-note">Activity labels come from RescueTime.</p>
  </article>;
}
