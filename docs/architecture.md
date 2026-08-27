# Architecture (skillfold)

Dependency direction points inward:

```
app/transport -> interface-adapters -> application -> domain
infrastructure -----------------------> application (gateway implementations)
```

- `src/domain/calendar` — pure types/transforms. No framework, provider, or infra imports.
- `src/application/gateways` — capability port (interface). Names are capabilities, not vendors.
- `src/application/services` — use-case services with explicit `execute(...)`. No provider logic.
- `src/application/app-container.ts` — composition root; wires adapters + env config only.
- `src/infrastructure/google` — Google Calendar API adapter (holds fetch + key).
- `src/infrastructure/sample` — deterministic in-memory adapter for tests (no network/SDK).
- `src/app/api/calendar/route.ts` — serverless entrypoint; reads env, calls service.
- `src/app/page.tsx` — kiosk page; client fetch + render.

Secrets live only in environment config (Vercel env), never in source or client.

## Gateway
`CalendarGateway.list(range): Promise<CalendarEvent[]>` — single capability port.

## Verification
`npm run verify:pr` → lint (incl. layer guard) + typecheck + vitest.
