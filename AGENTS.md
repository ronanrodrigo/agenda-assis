# AGENTS.md

Static kiosk site (no build system, no dependencies, no tests). Content edits live directly in `index.html`.

## What this repo is

- `index.html`: campaign-agenda kiosk page. Embeds **two side-by-side Google Calendar iframes** (current month + next month) with a red QR hero banner; on mobile (`<768px`) switches to a single date-less iframe plus a full-width "Abrir no Google Agenda" button.
- `kiosk.sh`: Linux fullscreen launcher. **Not runnable on macOS** — it uses `xset`, `unclutter`, `xdotool`, and `chromium-browser`. Only relevant to the physical kiosk box.
- `.freebuff/`: gitignored tool state (project-id). Never commit it.

## Gotchas an agent would likely miss

- **Calendar data lives in Google Calendar, not here.** Edit events at the embedded calendar; the repo only configures the embed URL. Changes to this repo won't reflect as agenda changes.
- **The calendar embed URL is hardcoded** in the inline `script` in `index.html` (calendar `${assis.capim%40gmail.com}`, `ctz=America/Sao_Paulo`, `mode=AGENDA`, `hl=pt_BR`, red `color=%23c62828`). The current/next-month iframes build `&dates=YYYYMMDD/...` from JS; the mobile iframe omits `dates`.
- **No CI / no deploy pipeline.** Pushing to `main` does not publish. The live page is https://ronanrodrigo.dev/agenda-assis and is deployed manually (site source displayed in `index.html`).
- **Scrollbar `meta`/iOS quirks are intentional**: `showDate=0`, `scrolling="no"`, the `90.91%` iframe size with `transform: scale(1.1)`, and the red `#c62828` accent are deliberate to make the embed fill the screen. Don't "fix" them without reason.
- The page auto-refreshes every 5 minutes (`<meta http-equiv="refresh" content="300">`).

## Style conventions

- UI text is **pt-BR**. Chrome/Chromium kiosk app name is "Agenda Campanha".
- Red hero gradient is `#c62828 → #b71c1c`.
