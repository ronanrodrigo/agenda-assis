# AGENTS.md

Custom campaign-agenda kiosk. A **Next.js (App Router)** app that reads a **public Google Calendar** via the Calendar API through a **serverless proxy** (API key kept server-side), and renders a themed agenda page. Replaces the old static `index.html` iframe embed.

## What this repo is

- **App (Next.js 14, TypeScript strict, skillfold architecture):**
  - `src/app/page.tsx` — kiosk page (client). Fetches `/api/calendar` and renders: top "Hoje" band grouped by Manhã/Tarde/Noite, left column = current month (from today onward, one card per day), right column = next month. On mobile (`<768px`) hides the right column + "Hoje" band and shows a full-width "Abrir no Google Agenda" button.
  - `src/app/api/calendar/route.ts` — serverless proxy. Reads env, calls the service, returns `AgendaResponse`. **API key never reaches the client.**
  - `src/app/globals.css` — design tokens (bege/cream neutral palette, single accent `--accent` used only on the hero; gold star). Mobile + kiosk layouts.
  - `src/app/layout.tsx` — root layout, loads `globals.css`.
- **Domain / application / infrastructure (skillfold layers):**
  - `src/domain/calendar/event.ts` — pure types/transforms.
  - `src/application/gateways/calendar-gateway.ts` — capability port (`CalendarGateway`).
  - `src/application/services/calendar-service.ts` — use-case logic (grouping, month split, period split).
  - `src/application/app-container.ts` — composition root (wires adapter + env).
  - `src/infrastructure/google/google-calendar-gateway.ts` — Google Calendar API adapter (holds fetch + key).
  - `src/infrastructure/sample/in-memory-calendar-gateway.ts` — deterministic adapter for tests.
  - `src/interface-adapters/http/calendar-response.ts` — `AgendaResponse` contract (`today`, `currentMonth`, `nextMonth`).
- **`agenda-prototype.html`** — standalone static prototype (self-contained fixtures) used to iterate on the visual design before touching the Next.js app. Open in the preview pane to react to changes; port approved changes into `page.tsx`/`globals.css`.
- **`index.html`** — legacy redirector served by **GitHub Pages** at `ronanrodrigo.dev/agenda-assis`. It only redirects to the live Vercel site (`https://agenda-assis.vercel.app`). Do not put app logic here.
- **`kiosk.sh`** — Linux fullscreen launcher. **Not runnable on macOS** (uses `xset`, `unclutter`, `xdotool`, `chromium-browser`). Only relevant to the physical kiosk box.
- **`.freebuff/`** — gitignored tool state. Never commit it.
- **`.hermes/plans/`** — implementation plans. **`.hermes/plans/STATUS.md`** tracks each plan's status (✅ done / 🟡 partial / ⬜ pending / ❌ obsoleto) with commit/PR/deploy evidence. **Check it before starting or claiming any planned work** — it is the source of truth for what's already built vs. pending.

## Architecture (skillfold)

Dependency direction points inward:

```
app/transport -> interface-adapters -> application -> domain
infrastructure -----------------------> application (gateway implementations)
```

- `domain` has no framework/provider/infra imports.
- `application/gateways` are capability ports (interfaces), named by capability not vendor.
- `infrastructure/google` is the only place that holds the API key + fetch.
- Secrets live **only** in environment config (Vercel env / `.env.local`), never in source or client.

## Gotchas an agent would likely miss

- **Calendar data lives in Google Calendar, not here.** The repo only renders what the API returns. Event edits happen in the calendar itself.
- **Public calendar + read-only ⇒ any GCP API key works.** No OAuth / owner token needed. The key is `GOOGLE_CALENDAR_API_KEY` (restrict it to the Calendar API in GCP). `GOOGLE_CALENDAR_ID = assis.capim@gmail.com`.
- **API key is server-side only.** `src/app/api/calendar/route.ts` reads env and proxies; the client never sees the key. Do not move the fetch to the client or hardcode the key.
- **`index.html` is NOT the app.** It's a GitHub Pages redirect to the Vercel site. Editing it does not change the agenda — change `src/app/page.tsx` instead.
- **Current month column shows only from today onward** (`page.tsx` filters `e.day >= new Date().getDate()`). Past days are intentionally dropped.
- **Day card header:** `DD/Mês` left, `Dia da Semana` right (same size/weight; weekday softened with `var(--muted)`), separated by `space-between`. No hyphen.
- **No CI on git push for the app itself beyond Vercel's build.** Vercel auto-deploys preview on PR and production on push to `main`. GitHub Pages rebuilds from `main` for the redirector only.
- **`.env.local` is gitignored** (holds the real key). `.env.example` is the template. Never commit `.env.local`.
- **Vercel Deployment Protection was disabled** on this project (public kiosk). If you re-enable it, the live API/page will 403 for unauthenticated visitors.
- **`/api/calendar` caches** server-side via the adapter's `maxDuration` window; the page also refreshes every 5 min client-side.

## Verification

```bash
npm install
npm run verify:pr   # lint (incl. skillfold layer guard) + typecheck + vitest
npm run dev         # local dev (needs .env.local with GOOGLE_CALENDAR_API_KEY + GOOGLE_CALENDAR_ID)
```

- Tests: `vitest` (domain + service; 7 tests). Adapter is covered indirectly; in-memory adapter used in unit tests (no network).
- Typecheck: `tsc --noEmit` (strict).
- Layer guard: ESLint `no-restricted-imports` prevents `domain`/`application` from importing infra/provider code.

## Deploy

- **Vercel** is the real host (`agenda-assis.vercel.app`, project `rohones/agenda-assis`).
  - Env vars (Secret): `GOOGLE_CALENDAR_API_KEY`, `GOOGLE_CALENDAR_ID`.
  - `vercel deploy` → preview; `vercel deploy --prod` → production. Pushing `main` also triggers a production build.
- **GitHub Pages** serves only `index.html` (redirect to Vercel) at `ronanrodrigo.dev/agenda-assis`. Keep the redirect pointing at the stable `https://agenda-assis.vercel.app` (not a per-deploy hash URL).

## Style conventions

- UI text is **pt-BR**. Chrome/Chromium kiosk app name is "Agenda Campanha".
- **Neutral bege/cream palette** (warm paper tones), single accent `--accent:#8c2f2c` used **only on the hero**. Gold star `#f2c200`. No campaign-red branding elsewhere, no gradients, no glass.
- Cohesive type scale via CSS vars (`--fs-*` / `--w-*`). Day card = one card per day with a clean internal list (not one card per event).
- Kiosk layout is designed for a **vertical monitor**; large-screen default = top "Hoje" band (~20% height, full width) + left/right month columns (50/50). Mobile = current month only + button.
