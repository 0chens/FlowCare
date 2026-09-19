export function dateInZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function wallTimeInZone(now: Date, timeZone: string): string {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(now);
  return `${dateInZone(now, timeZone)}T${time}`;
}
// RescueTime timestamps are account-local wall times. Compare on the same clock,
// without letting the deployment server's timezone reinterpret them.
export function wallTimeMs(timestamp: string): number {
  const match = /^(\d{4}-\d{2}-\d{2})(?:T| )(\d{2}:\d{2})(?::(\d{2}))?/.exec(timestamp);
  if (!match) return NaN;
  return Date.parse(`${match[1]}T${match[2]}:${match[3] ?? "00"}Z`);
}
