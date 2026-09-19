import { afterEach, describe, expect, it, vi } from "vitest";
import { rescueTimeRequest, fetchRescueTime } from "../lib/rescuetime";
import { buildDashboard } from "../lib/dashboard";
import { GET, POST } from "../app/api/dashboard/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("server integration", () => {
  it("accepts a preference in a POST body and rejects invalid notes", async () => {
    vi.stubEnv("USE_MOCK_DATA", "true"); vi.stubEnv("OPENAI_API_KEY", "");
    const response = await POST(new Request("http://localhost/api/dashboard", { method: "POST", body: JSON.stringify({ insightNote: "Help me focus on one task" }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).insight.recommendation).toContain("Choose one task");
    for (const insightNote of [42, "x".repeat(401), null]) {
      expect((await POST(new Request("http://localhost/api/dashboard", { method: "POST", body: JSON.stringify({ insightNote }) }))).status).toBe(400);
    }
  });
  it("authenticates using a header and never a query secret", async () => {
    vi.stubEnv("RESCUETIME_API_KEY", "test-private-secret");
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ row_headers: [], rows: [] })));
    vi.stubGlobal("fetch", fetch);
    await rescueTimeRequest({ perspective: "rank", restrict_kind: "activity", restrict_begin: "2026-09-19", restrict_end: "2026-09-19" });
    const [url, options] = fetch.mock.calls[0]!;
    expect(String(url)).not.toContain("test-private-secret");
    expect(options.headers.Authorization).toBe("Bearer test-private-secret");
  });
  it("requests seven complete historical days and current minute activity", async () => {
    vi.stubEnv("RESCUETIME_API_KEY", "test"); vi.stubEnv("FLOWCARE_TIMEZONE", "America/New_York");
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ row_headers: [], rows: [] })))); vi.stubGlobal("fetch", fetch);
    await fetchRescueTime(new Date("2026-09-19T01:00:00Z"));
    const urls = fetch.mock.calls.map(call => new URL(String(call[0])));
    expect(urls[0]!.searchParams.get("resolution_time")).toBe("minute");
    expect(urls[2]!.searchParams.get("restrict_begin")).toBe("2026-09-11");
    expect(urls[2]!.searchParams.get("restrict_end")).toBe("2026-09-17");
  });
  it("runs mock mode without credentials or external calls", async () => {
    vi.stubEnv("USE_MOCK_DATA", "true"); vi.stubEnv("OPENAI_API_KEY", ""); vi.stubEnv("RESCUETIME_API_KEY", "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const data = await buildDashboard(); expect(fetch).not.toHaveBeenCalled(); expect(data.analysis.state).toBe("extended_activity"); expect(data.insightSource).toBe("fallback");
  });
  it("returns safe errors in live mode without silently switching to mock", async () => {
    vi.stubEnv("USE_MOCK_DATA", "false"); vi.stubEnv("RESCUETIME_API_KEY", "");
    const response = await GET(); expect(response.status).toBe(502); expect(await response.json()).toEqual({ error: "We couldn't retrieve your RescueTime activity." });
  });
});
