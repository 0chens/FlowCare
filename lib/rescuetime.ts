import "server-only";
import { parseResponse } from "./normalize";
import { dateInZone, shiftDate, wallTimeInZone } from "./dates";
import type { ActivityBundle, RescueTimeResponse } from "./types";
import { ProviderError } from "./provider-error";

const ENDPOINT = "https://www.rescuetime.com/anapi/data";
type Query = { perspective: "interval" | "rank"; restrict_kind: "activity" | "productivity";
  restrict_begin: string; restrict_end: string; resolution_time?: "minute" | "day" };
export async function rescueTimeRequest(query: Query): Promise<RescueTimeResponse> {
  const apiKey = process.env.RESCUETIME_API_KEY?.trim();
  if (!apiKey) throw new ProviderError("missing_key");
  const url = new URL(ENDPOINT);
  Object.entries({ ...query, format: "json" }).forEach(([key, value]) => url.searchParams.set(key, value));
  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store", signal: AbortSignal.timeout(15000), redirect: "error" });
  } catch { throw new ProviderError("network"); }
  if (response.status === 401 || response.status === 403) throw new ProviderError("unauthorized");
  if (response.status === 429) throw new ProviderError("rate_limited");
  if (!response.ok) throw new ProviderError("unavailable");
  try { return parseResponse(await response.json() as unknown); }
  catch { throw new ProviderError("invalid_response"); }
}
export async function fetchRescueTime(now = new Date()): Promise<ActivityBundle> {
  // Set FLOWCARE_TIMEZONE to the same IANA timezone as the RescueTime account.
  const timeZone = process.env.FLOWCARE_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayDate = dateInZone(now, timeZone);
  const range = { restrict_begin: todayDate, restrict_end: todayDate };
  const [interval, ranked, historical] = await Promise.all([
    rescueTimeRequest({ ...range, perspective: "interval", resolution_time: "minute", restrict_kind: "activity" }),
    rescueTimeRequest({ ...range, perspective: "rank", restrict_kind: "activity" }),
    rescueTimeRequest({ perspective: "interval", resolution_time: "day", restrict_kind: "productivity", restrict_begin: shiftDate(todayDate, -7), restrict_end: shiftDate(todayDate, -1) }),
  ]);
  return { interval, ranked, historical, todayDate, referenceTime: wallTimeInZone(now, timeZone), timeZone };
}
