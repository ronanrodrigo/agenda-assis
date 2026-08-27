# Agenda Campanha — API do Google Calendar (página customizada via Vercel + skillfold)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task, with spec-compliance review then code-quality review after each task.

**Goal:** Substituir os iframes do Google Calendar por uma agenda própria com a cara da campanha (lista de compromissos em vermelho, com eventos do dia, do mês corrente e do mês seguinte), buscando os dados via Google Calendar API através de uma função serverless na Vercel que esconde a API key e faz cache. Segue a arquitetura skillfold (camadas domain/application/infrastructure/interface-adapters). O agente resolve credenciais usando o browser local logado; validação em branches com preview da Vercel; protótipo em HTML estático antes de mexer no `index.html`.

**Architecture:** App Next.js (App Router, TypeScript strict) seguindo skillfold: `domain/` (tipos puros) → `application/` (gateway port + use-case service) → `infrastructure/` (adapter Google Calendar + adapter in-memory p/ testes) → `app/api/calendar/route.ts` (entrypoint serverless que lê a API key do env) e `app/page.tsx` (página kiosk). O frontend faz `fetch('/api/calendar')` e renderiza 3 regiões (hoje / mês corrente / próximo mês) em modo lista. Protótipo estático `agenda-prototype.html` valida o visual antes de tocar no `index.html`.

**Tech Stack:** Next.js 14+ (App Router) + React + TypeScript strict; Vercel Serverless Functions (Node); Google Calendar API v3 (API key, calendário público); Vitest (testes unitários, offline, com adapter in-memory); ESLint (`eslint-config-next` + regra de dependência skillfold); `vercel` CLI com `VERCEL_TOKEN`.

---

## Requisitos capturados (do usuário)

1. **Browser local logado** resolve registros e extrai secrets (Google Cloud / Vercel) — o agente dirige o browser (`browser_exec(local=true)`), não o usuário.
2. Usar as env vars de `/Users/ronan/Developer/skills/.env` quando necessário (VERCEL_TOKEN, GITHUB_TOKEN, GOOGLE_RONANRODRIGODEV_*, etc.). **Nunca comitar secrets.**
3. Arquitetura deve seguir a skill **skillfold** (camadas + gateways/adapters + ESLint de dependência).
4. Trabalhar em **branches/worktrees novas**; validar com **preview da Vercel**.
5. Criar **página nova estática HTML** para testar a mudança sem mexer no `index.html`.
6. **Layout kiosk pensado para monitor na vertical** (retrato).
7. **Layout tela grande (default = kiosk vertical):** topo 100% largura ~20% altura = eventos do **dia corrente**; abaixo, esquerda 50% = **mês corrente**, direita 50% = **próximo mês**. Tudo em **modo lista/compromisso**.
8. **Layout celular:** apenas eventos do **mês corrente** + botão "Abrir no Google Agenda".
9. O calendário é **público**: `https://calendar.google.com/calendar/embed?src=assis.capim%40gmail.com&ctz=America%2FSao_Paulo` → logo, API key basta (sem OAuth).

**Plus:** usar tokens de design de `/popular-web-designs` (a definir na CLARIFICAÇÃO); notificar evolução (ver Risco/Telegram abaixo).

---

## Decisões de arquitetura (skillfold, adaptada)

Árvore proposta (TypeScript, `@/*` → `src/*`):

```
src/
  domain/calendar/
    event.ts                      # tipo Event + transformações puras (sem framework/provider)
  application/
    gateways/calendar-gateway.ts # interface CalendarGateway (port, nome de capacidade)
    services/calendar-service.ts # use-case: busca intervalo e particiona (hoje/mês/próximo)
    app-container.ts             # composition root (wire adapter + env)
  infrastructure/
    google/google-calendar-gateway.ts  # adapter: fetch na API v3 com API key
    sample/in-memory-calendar-gateway.ts # adapter determinístico p/ testes
  interface-adapters/
    http/calendar-response.ts    # mapeia Items da API → Event (tradução de erro)
  app/
    api/calendar/route.ts        # entrypoint serverless (lê env, chama service)
    page.tsx                     # página kiosk (produção, substitui index.html)
    agenda-prototype.html        # protótipo estático p/ validar visual (req 5)
    globals.css                  # tokens de design + tema campanha
docs/architecture.md            # regras de dependência (skillfold)
docs/adr/                        # ADR se houver decisão não-óbvia
```

Direção de dependência (seta p/ dentro): `app/transport → interface-adapters → application → domain`; `infrastructure → application`. ESLint proíbe imports de framework/provider em `domain` e `application`.

---

## Fases & Tarefas

### Fase 0 — Secrets & projeto (feito pelo agente principal, via browser local)

#### Task 0.1: Extrair API key do Google Calendar via browser logado
- **Objetivo:** obter `GOOGLE_CALENDAR_API_KEY` sem pedir ao usuário.
- Usar `browser_exec(local=true)` (browser do usuário, já logado em contas Google).
- Passos no browser: abrir `https://console.cloud.google.com/` → projeto `ronanrodrigo.dev` (ou criar) → **APIs e Serviços → Biblioteca → Google Calendar API → Habilitar** → **Credenciais → Criar chave de API** → restringir à Calendar API + domínio da Vercel.
- Copiar a chave para uso em env var (Task 0.3). **Não comitar.**
- *Fallback:* se a automação do GCP falhar (UI dinâmica), pedir ao usuário que cole a chave do console (1 min) e seguir.

#### Task 0.2: Link do projeto Vercel
- `npm i -g vercel`; `vercel login` (ou usar `VERCEL_TOKEN` já presente no `.env`).
- `vercel link` na raiz para criar/vincular o projeto.

#### Task 0.3: Configurar env vars na Vercel (secretas)
```bash
vercel env add GOOGLE_CALENDAR_API_KEY   # da Task 0.1
vercel env add GOOGLE_CALENDAR_ID        # assis.capim@gmail.com
```
- Criar `.env.example` (modelo, sem valor real) com as duas.
- **Nunca** comitar `.env` ou a chave real.

#### Task 0.4: Branch de trabalho
- `git checkout -b feat/custom-agenda` (worktree se preferir: `git worktree add ../agenda-assis-feat feat/custom-agenda`).

---

### Fase 1 — Scaffold Next.js + skillfold (subagente)

#### Task 1.1: package.json / tsconfig / next.config / eslint
- Criar `package.json` (Next 14, react, typescript, vitest, eslint, eslint-config-next). Scripts: `dev`, `build`, `start`, `lint`, `test`, `verify:pr` (lint+typecheck+test).
- `tsconfig.json` strict + `@/*`.
- `eslint.config.mjs` com regra de dependência skillfold (`no-restricted-imports` por camada).
- `docs/architecture.md` resumindo direção de dependência.

#### Task 1.2: domain/calendar/event.ts (TDD)
```ts
// src/domain/calendar/event.ts
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start: string;   // ISO
  end: string;     // ISO
  allDay: boolean;
}
export function toDate(iso: string): Date {
  return new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
}
```

#### Task 1.3: Teste do domain (Vitest)
- `src/domain/calendar/event.test.ts`: `toDate` trata all-day (`YYYY-MM-DD`) e datetime.

---

### Fase 2 — Gateway + Service (subagente, TDD)

#### Task 2.1: gateway port
```ts
// src/application/gateways/calendar-gateway.ts
import type { CalendarEvent } from '@/domain/calendar/event';
export interface CalendarRange { timeMin: string; timeMax: string; }
export interface CalendarGateway {
  list(range: CalendarRange): Promise<CalendarEvent[]>;
}
```

#### Task 2.2: use-case service (particiona hoje/mês/próximo)
```ts
// src/application/services/calendar-service.ts
import type { CalendarEvent } from '@/domain/calendar/event';
import type { CalendarGateway } from '@/application/gateways/calendar-gateway';
import { toDate } from '@/domain/calendar/event';

export interface AgendaView { today: CalendarEvent[]; currentMonth: CalendarEvent[]; nextMonth: CalendarEvent[]; }

export class BuildAgendaService {
  constructor(private readonly gateway: CalendarGateway) {}
  async execute(now = new Date()): Promise<AgendaView> {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    const events = await this.gateway.list({ timeMin: start.toISOString(), timeMax: end.toISOString() });
    const isSameDay = (e: CalendarEvent) => toDate(e.start).toDateString() === now.toDateString();
    const inMonth = (e: CalendarEvent, m: number, y: number) => { const d = toDate(e.start); return d.getMonth() === m && d.getFullYear() === y; };
    return {
      today: events.filter(isSameDay),
      currentMonth: events.filter(e => inMonth(e, now.getMonth(), now.getFullYear()) && !isSameDay(e)),
      nextMonth: events.filter(e => { const nm = now.getMonth() + 1; const ny = now.getFullYear() + (nm > 11 ? 1 : 0); return inMonth(e, nm % 12, ny); }),
    };
  }
}
```

#### Task 2.3: adapter in-memory (sample) + test do service
- `src/infrastructure/sample/in-memory-calendar-gateway.ts` (estado determinístico).
- `src/application/services/calendar-service.test.ts` com fixture: garante partição correta (hoje / mês / próximo mês) e ordem por start.

#### Task 2.4: adapter Google Calendar (infra) + interface-adapter de resposta
```ts
// src/infrastructure/google/google-calendar-gateway.ts
import type { CalendarEvent } from '@/domain/calendar/event';
import type { CalendarGateway, CalendarRange } from '@/application/gateways/calendar-gateway';

export class GoogleCalendarGateway implements CalendarGateway {
  constructor(private readonly apiKey: string, private readonly calendarId: string) {}
  async list(range: CalendarRange): Promise<CalendarEvent[]> {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/'
      + encodeURIComponent(this.calendarId) + '/events?key=' + this.apiKey
      + '&timeMin=' + encodeURIComponent(range.timeMin) + '&timeMax=' + encodeURIComponent(range.timeMax)
      + '&singleEvents=true&orderBy=startTime';
    const r = await fetch(url);
    if (!r.ok) throw new Error('google_calendar_failed:' + r.status);
    const data = await r.json() as { items?: any[] };
    return (data.items ?? []).map(mapItem);
  }
}
function mapItem(e: any): CalendarEvent {
  return { id: e.id, title: e.summary || '(sem título)', description: e.description || '',
    location: e.location || '', start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date, allDay: !e.start?.dateTime };
}
```

#### Task 2.5: composition root
- `src/application/app-container.ts`: cria `GoogleCalendarGateway` com `process.env.GOOGLE_CALENDAR_API_KEY` / `GOOGLE_CALENDAR_ID` e `BuildAgendaService`.

---

### Fase 3 — Protótipo estático (req 5) + tema (subagente)

#### Task 3.1: `src/app/agenda-prototype.html`
- HTML estático autocontido (CSS inline + JS) com **dados de exemplo embutidos** (fixture realista baseada no calendário actual: Encontro de CEBs, Reunião do gabinete, etc.).
- 3 regiões: `#today` (topo ~20% altura, 100% largura), `#current-month` (50% esquerda), `#next-month` (50% direita). Modo lista (compromisso): horário + título + local/descrição.
- **Tema campanha:** manter o vermelho atual da campanha (`#c62828 → #b71c1c`), só mais limpo — **sem** sistema de terceiro. Header gradiente vermelho; acento vermelho nos cards; estrela dourada; QR hero. Tipografia/espaçamento refinados, sem importar template do `/popular-web-designs`.
- **Kiosk vertical:** container com `aspect-ratio` retrato / `max-width` derivado da altura para parecer monitor na vertical; colunas lado a lado abaixo do topo.
- **Mobile** (`@media (max-width:768px)`): esconde `#next-month` e `#current-month` em coluna dupla → mostra só `#current-month` em coluna única + botão "🗓️ Abrir no Google Agenda".
- Commit na branch; deploy de preview para validar visual.

#### Task 3.2: Validar protótipo no preview da Vercel
- `vercel deploy --token $VERCEL_TOKEN --prebuilt` (ou `vercel deploy` na branch) → abrir URL de preview.
- Conferir no browser (preview pane): topo hoje, colunas mês/próximo, mobile empilha + botão. Ajustar tokens conforme CLARIFICAÇÃO.

---

### Fase 4 — API route + página real (subagente)

#### Task 4.1: `src/app/api/calendar/route.ts`
```ts
import { NextResponse } from 'next/server';
import { buildContainer } from '@/application/app-container';
import { BuildAgendaService } from '@/application/services/calendar-service';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const { gateway } = buildContainer();
    const view = await new BuildAgendaService(gateway).execute();
    const res = NextResponse.json(view);
    res.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
```

#### Task 4.2: `src/app/page.tsx` (produção)
- Client component que faz `fetch('/api/calendar')`, renderiza as 3 regiões com os mesmos tokens do protótipo (reaproveita CSS de `globals.css`). Header/QR/estrela idênticos ao protótipo. Poll a cada 5 min.
- `globals.css` com tokens + layout (topo 20% / 50-50) + media query mobile.

#### Task 4.3: Substituir `index.html`
- Migrar o conteúdo de `page.tsx` para ser a home; remover/arquivar `index.html` antigo (ou redirecionar). Atualizar `AGENTS.md` (já não é "sem build").
- `kiosk.sh` aponta para a URL da Vercel (branch de produção).

---

### Fase 5 — Verificação & deploy

#### Task 5.1: `npm run verify:pr` (lint + typecheck + vitest) — deve passar.
#### Task 5.2: Preview da Vercel na branch → conferir no browser os dados REAIS (não fixture).
#### Task 5.3: `vercel --prod --token $VERCEL_TOKEN` → produção.
#### Task 5.4: Atualizar `docs/adr/` se decisão não-óbvia; atualizar `CALENDAR_SETUP.md` com URL + domínio p/ restringir API key.

---

## Arquivos que mudam/criam
- Cria: `package.json`, `tsconfig.json`, `next.config.mjs`, `eslint.config.mjs`, `vercel.json`, `.env.example`, `docs/architecture.md`, `src/domain/calendar/event.ts` (+test), `src/application/gateways/calendar-gateway.ts`, `src/application/services/calendar-service.ts` (+test), `src/application/app-container.ts`, `src/infrastructure/google/google-calendar-gateway.ts`, `src/infrastructure/sample/in-memory-calendar-gateway.ts`, `src/interface-adapters/http/calendar-response.ts`, `src/app/api/calendar/route.ts`, `src/app/page.tsx`, `src/app/agenda-prototype.html`, `src/app/globals.css`, `CALENDAR_SETUP.md`.
- Modifica: `index.html` (ou removido), `kiosk.sh`, `AGENTS.md`.
- NÃO comita: `.env`, chave real, `GOOGLE_RONANRODRIGODEV_CLIENT_SECRET_JSON`.

## Riscos / trade-offs / pendências
- **Browser do GCP (Task 0.1):** UI dinâmica; pode falhar. Fallback = pedir chave colada. Se o projeto `ronanrodrigo.dev` já tiver API key, apenas copiar.
- **OAuth vs API key:** calendário é público (req 9) → API key basta. Os `GOOGLE_RONANRODRIGODEV_*` (OAuth) ficam como reserva; não usados no serverless para evitar fluxo de consentimento.
- **Telegram:** não há tool de Telegram configurado neste ambiente. Status será reportado **aqui no chat** a cada fase; se o usuário fornecer um `TELEGRAM_BOT_TOKEN` + `CHAT_ID`, o agente pode `curl` a API do Telegram para notificar (sem bloquear).
- **skillfold overkill?** É explícito no req 3; mantido proporcional (não cria gateways extras desnecessários).
- **Domínio:** deploy manual antigo em `ronanrodrigo.dev/agenda-assis` deve ser redirecionado para a URL da Vercel ou configurar domínio custom.
- **Limite da API key:** restringir à Calendar API + domínio de produção após saber a URL.
