import type { ActivityBundle, RescueTimeResponse } from "../lib/types";
import { dateInZone, shiftDate } from "../lib/dates";

export function mockRescueTime(now = new Date()): ActivityBundle {
  const timeZone = "America/New_York", todayDate = dateInZone(now, timeZone);
  // A reproducible afternoon snapshot, even when a demo is opened at night.
  const referenceTime = `${todayDate}T15:30:00`;
  const specs = [
    { name: "Visual Studio Code", minutes: 122, category: "Software Development", rating: 2 },
    { name: "Chrome", minutes: 71, category: "Reference & Learning", rating: 0 },
    { name: "Figma", minutes: 38, category: "Design & Composition", rating: 2 },
    { name: "Slack", minutes: 29, category: "Communication & Scheduling", rating: 0 },
    { name: "Notion", minutes: 50, category: "Business", rating: 1 },
  ];
  // 41 earlier buckets (205m), a gap, then 21 consecutive buckets (105m).
  const starts = [...Array.from({ length: 41 }, (_, i) => 8 * 60 + i * 5 + (i >= 18 ? 25 : 0) + (i >= 32 ? 30 : 0)),
    ...Array.from({ length: 21 }, (_, i) => 13 * 60 + 45 + i * 5)];
  const rows: unknown[][] = [];
  let elapsed = 0;
  for (const start of starts) {
    // Split buckets at app boundaries so ranks and intervals reconcile exactly.
    let remaining = 5;
    while (remaining > 0) {
      let boundary = 0;
      const app = specs.find(s => { boundary += s.minutes; return elapsed < boundary; })!;
      const take = Math.min(remaining, boundary - elapsed);
      // Exactly 205 productive, 40 distracting, 65 neutral minutes overall.
      const appStart = boundary - app.minutes;
      const localMinute = elapsed - appStart;
      const rating = app.name === "Chrome" ? (localMinute < 40 ? -1 : 0)
        : app.name === "Notion" ? (localMinute < 45 ? 1 : 0) : app.rating;
      const ratingBoundary = app.name === "Chrome" && localMinute < 40 ? appStart + 40
        : app.name === "Notion" && localMinute < 45 ? appStart + 45 : boundary;
      const duration = Math.min(take, ratingBoundary - elapsed);
      rows.push([`${todayDate}T${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}:00`, duration * 60, 1, app.name, app.category, rating]);
      elapsed += duration; remaining -= duration;
    }
  }
  const interval: RescueTimeResponse = { notes: "Demo snapshot at 15:30; five-minute intervals.", row_headers: ["Date", "Time Spent (seconds)", "Number of People", "Activity", "Category", "Productivity"], rows };
  const ranked: RescueTimeResponse = { notes: "Demo ranks", row_headers: ["Rank", "Time Spent (seconds)", "Number of People", "Activity", "Category", "Productivity"],
    rows: specs.map((s, i) => [i + 1, s.minutes * 60, 1, s.name, s.category, s.rating]) };
  const historical: RescueTimeResponse = { notes: "Previous seven complete days", row_headers: ["Date", "Time Spent (seconds)", "Number of People", "Productivity"], rows: [] };
  for (let day = 1; day <= 7; day++) {
    const offset = (day - 4) * 5;
    for (const [rating, minutes] of [[2, 150 + offset], [-1, 45], [0, 45]]) {
      historical.rows.push([`${shiftDate(todayDate, -day)}T00:00:00`, minutes! * 60, 1, rating]);
    }
  }
  return { interval, ranked, historical, todayDate, referenceTime, timeZone };
}
