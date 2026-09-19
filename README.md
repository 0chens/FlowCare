# FlowCare

A complete, privacy-conscious digital-wellness dashboard built with Next.js App Router, React, TypeScript, Tailwind CSS, Recharts, Lucide, and the OpenAI SDK. No database required.

FlowCare compares computer activity with your own recent pattern. Its deterministic engine describes observable activity; the AI layer writes a concise explanation and a practical suggestion. This is **not medical software**. Digital Balance is an activity-pattern visualization, not a health, mental-health, or burnout score.

## Quick start

Use Node.js 22.12+ and npm (included with a standard Node.js installation).

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp` if needed. Open [localhost:3000/dashboard](http://localhost:3000/dashboard). `/` redirects there. The development server binds to loopback by default.

```env
USE_MOCK_DATA=true
```

This is an instant demo with **no external credentials required**. If the setting is absent, demo mode is the default. Demo data goes through exactly the same normalization and calculation pipeline as live data. It represents an explicitly labeled 3:30 pm snapshot on today's New York date, even when you open the demo in the morning or evening:

- 310 tracked minutes, 205 productive minutes, 40 distracting minutes, 65 neutral minutes.
- Seven historical days averaging 240 tracked, 150 productive, and 45 distracting minutes.
- Approximately 105 minutes of recent sustained activity; `extended_activity` state; **65/100** Digital Balance.
- Five applications, a real interactive chart, refresh, and an accessible explanation accordion.

## Live RescueTime

Create an API key in your RescueTime account's developer settings, then set these **server-only** values in `.env.local` and restart the server:

```env
RESCUETIME_API_KEY=your-rescuetime-key
USE_MOCK_DATA=false
```

Set the optional `FLOWCARE_TIMEZONE=America/New_York` (or your IANA timezone) to **match your RescueTime account timezone**, particularly on deployments that default to UTC. Without it, the server's local timezone is used. The dashboard displays the data timezone; it does not reinterpret the activity chart in the browser's timezone.

`lib/rescuetime.ts` is the live data entry point. It uses native `fetch` to request `https://www.rescuetime.com/anapi/data` with `Authorization: Bearer ...`, never a query-string API key. Three concurrent requests retrieve:

1. Today's interval activity, `perspective=interval`, `resolution_time=minute`, `restrict_kind=activity`.
2. Today's ranked applications, `perspective=rank`, `restrict_kind=activity`.
3. The previous seven complete calendar days, `perspective=interval`, `resolution_time=day`, `restrict_kind=productivity`.

All requests use explicit account-local begin/end dates and `format=json`. Live failures produce a generic retryable error, never silently switch to demo data, and never expose provider error bodies. Requests have a 15-second timeout and reject redirects.

## Optional AI explanations

The “Before your insight” card accepts an optional 400-character note about the kind of guidance you want. Choose a suggestion or write your own, then click **Update insight**. Refresh reuses your applied preference; clearing the field and submitting restores the default. Notes stay in page memory and reset on reload. They are sent in a POST body (not a URL) and, when enabled, forwarded to OpenAI alongside summarized metrics. Avoid private details. Notes personalize topic/tone only and cannot change the deterministic state or score. Without OpenAI, built-in guidance supports break and focus themes; other custom wording requires AI.

```env
OPENAI_API_KEY=your-openai-key
```

`lib/ai.ts` uses the current OpenAI SDK's Responses API with a strict Zod structured-output schema. The default model is `gpt-4.1-mini`; optionally set `OPENAI_MODEL` to another available model supporting structured outputs. The request has a 12-second timeout, no automatic retries, and `store: false`.

The model receives only an explicit allowlist of numeric derived metrics and the already-determined state. It receives **no application names, custom categories, raw URLs, page titles, document names, credentials, or raw history**. The AI never sets the state or score. Prompt constraints prohibit medical interpretation; a defensive output filter rejects diagnostic language, alarming phrasing, and links. This filter is a secondary safeguard, not a guarantee of perfect model behavior.

Missing keys, API failures, refusals, incomplete/malformed output, and rejected text all use deterministic guidance. The card identifies this as “Built-in guidance.” With an OpenAI key present, even demo mode may request an explanation; omit that key for a completely offline-data demo.

## Architecture

```text
RescueTime
  ↓
Next.js server
  ↓
normalization
  ↓
baseline engine
  ↓
wellness engine
  ↓
structured summary
  ↓
OpenAI (or deterministic fallback)
  ↓
dashboard
```

The browser makes one primary `GET /api/dashboard` request, again on refresh. Server-only modules assemble a typed payload; only normalized display data and derived results cross the browser boundary. Responses are private and uncached. Mock mode bypasses RescueTime entirely.

| File | Responsibility |
| --- | --- |
| `lib/rescuetime.ts` | Authenticated, bounded live requests |
| `lib/normalize.ts` | Runtime envelope validation; header-driven row parsing; metrics; interval estimate |
| `lib/baseline.ts` | Seven-day window and usable-day averages |
| `lib/wellness.ts` | Deterministic state, ratios, and Digital Balance |
| `lib/ai.ts` | Minimal model input, structured response, safe fallback |
| `lib/dashboard.ts` | Shared mock/live orchestration |
| `app/api/dashboard/route.ts` | Safe server endpoint |
| `components/` | Responsive, reusable dashboard sections |
| `data/mock-rescuetime.ts` | Reproducible API-shaped demo responses |
| `tests/` | Calculation, normalization, privacy boundary, and server tests |

## Calculation details and honest limitations

- Every RescueTime row is mapped by `row_headers`. Column order is never assumed. Invalid durations are skipped, missing optional productivity is neutral/unclassified, and malformed envelopes or missing required columns fail safely.
- Tracked/productive/distracting totals and timeline share today's interval source. Positive productivity values contribute to “Focus work”; negative ones to “Personal / distracting.” These are RescueTime classifications, **not proof of attention or quality of work**. Ranked data supplies the top-app list; independently refreshed upstream reports may differ slightly in live mode.
- The baseline uses only days with positive tracking inside the previous seven complete calendar days, excluding today. Missing or zero-activity days are not invented. Fewer than three usable days means `insufficient_data`, null score, and unavailable ratios. The UI reports the actual number of days.
- Ratios compare **today so far with a full-day average**, not an expected total for the current time of day. This can naturally produce low activity early in the day. There is no pressure to match a quota. Zero denominators yield `null`.
- RescueTime documents `minute` resolution as five-minute buckets. The sustained estimate walks backward through consecutive populated intervals, caps each interval's contribution at its inferred size, stops at gaps, and returns zero for stale activity. It uses finer spacing when actually returned. It cannot establish uninterrupted attention, exact session length, or whether someone stepped away inside a bucket.
- The chart aggregates source intervals into 30-minute bars and fills missing display slots with zero. This aggregation does not change the sustained-activity calculation.
- These MVP product heuristics determine state, in order: insufficient baseline; sustained ≥90m and activity ≥1.15× → extended; activity ≥1.30× → elevated; activity ≤0.60× → low; otherwise balanced.
- Digital Balance starts at 100, subtracts 10 above 1.10× and another 15 above 1.30×; subtracts 10 for sustained >60m and another 15 >90m; subtracts 15 below 0.60×. It is clamped to 0–100. These thresholds are not medically validated and the score is not a target to optimize.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Tests cover reordered/missing columns, malformed data, zero denominators, seven-day exclusion boundaries, state thresholds, stale/gapped activity, mock integration, bearer authentication, generic API errors, and AI fallbacks. Lint and strict TypeScript checking are separate scripts. TypeScript 6 is pinned for compatibility with the current ESLint parser. A pnpm lockfile is also supplied for `pnpm install --frozen-lockfile` users.

## Privacy and deployment

Both secrets stay in server-only modules and `.env.local` is gitignored. Neither secret has a `NEXT_PUBLIC_` prefix. No database, activity persistence, or application logging is introduced. RescueTime is a cloud service, and summarized metrics are sent to OpenAI when enabled; FlowCare does not claim data never leaves the device.

This is a **single-user local hackathon MVP**. The dashboard endpoint exposes activity from the server-configured RescueTime account. Before putting live credentials on an internet-accessible deployment, add authentication/access control (including for `/api/dashboard`) and appropriate rate limits. Never publish an unprotected live instance. An authentication system is deliberately outside this no-database MVP.

## API references

- [RescueTime Analytic Data API](https://www.rescuetime.com/rtx/developers)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
