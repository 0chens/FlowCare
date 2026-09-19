import { afterEach, describe, expect, it, vi } from "vitest";
const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock("openai", () => ({ default: class { responses = { parse }; } }));
import { createInsight } from "../lib/ai";
import { normalizeToday, normalizeHistory } from "../lib/normalize";
import { computeBaseline } from "../lib/baseline";
import { analyzeWellness } from "../lib/wellness";
import { mockRescueTime } from "../data/mock-rescuetime";
const raw = mockRescueTime(new Date("2026-09-19T19:30:00Z"));
const today = normalizeToday(raw.interval, raw.ranked);
const baseline = computeBaseline(normalizeHistory(raw.historical), raw.todayDate);
const analysis = analyzeWellness(today, baseline, 105);
afterEach(() => { vi.unstubAllEnvs(); parse.mockReset(); });
describe("AI boundary", () => {
  it("passes a preference separately from metrics without changing the analysis", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test");
    parse.mockResolvedValue({ output_parsed: { headline: "A pause", observation: "You've tracked 310 minutes.", recommendation: "Consider a short break." } });
    const original = JSON.stringify(analysis);
    await createInsight(today, baseline, analysis, "Help me plan breaks");
    const summary = JSON.parse(parse.mock.calls[0]![0].input[1].content);
    expect(summary.userPreferenceNote).toBe("Help me plan breaks");
    expect(summary.trackedMinutesToday).toBe(310);
    expect(JSON.stringify(analysis)).toBe(original);
  });
  it("personalizes fallback guidance and restores defaults when the note is cleared", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const focused = await createInsight(today, baseline, analysis, "Help me focus on one task");
    expect(focused.insight.recommendation).toContain("Choose one task");
    expect((await createInsight(today, baseline, analysis, "")).insight.recommendation).toContain("stepping away");
  });
  it("sends only a derived summary and preserves deterministic analysis", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-secret");
    parse.mockResolvedValue({ output_parsed: { headline: "A fuller day", observation: "You've tracked 310 minutes today.", recommendation: "Consider a short screen-free pause." } });
    const result = await createInsight(today, baseline, analysis);
    const request = parse.mock.calls[0]![0];
    const serialized = JSON.stringify(request);
    for (const privateValue of ["Chrome", "Visual Studio Code", "test-secret", "row_headers", "timeline"]) expect(serialized).not.toContain(privateValue);
    expect(request.store).toBe(false); expect(result.insightSource).toBe("openai"); expect(analysis.state).toBe("extended_activity");
  });
  it.each([null, { headline: "Burnout", observation: "Your stress is high.", recommendation: "Act now." }, { headline: "", observation: "", recommendation: "" }])("falls back for missing or disallowed output", async output => {
    vi.stubEnv("OPENAI_API_KEY", "test"); parse.mockResolvedValue({ output_parsed: output });
    expect((await createInsight(today, baseline, analysis)).insightSource).toBe("fallback");
  });
  it("falls back after API failure", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test"); parse.mockRejectedValue(new Error("private-provider-details"));
    const result = await createInsight(today, baseline, analysis); expect(result.insightSource).toBe("fallback"); expect(JSON.stringify(result)).not.toContain("private-provider-details");
  });
});
