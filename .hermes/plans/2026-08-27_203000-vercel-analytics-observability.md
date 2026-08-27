# Analytics e Observabilidade Vercel para o Painel Agenda Campanha

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Ligar Web Analytics, Speed Insights e logs estruturados no projeto `agenda-assis` (Vercel, time `rohones`) para saber quem acessa o painel, como ele performa e quando a integração com o Google Calendar falha — sem custo (Hobby) e com mínima mudança de código.

**Architecture:** O painel é um app Next.js 14 (App Router) servido pela Vercel. Analytics e Speed Insights são libs cliente (`@vercel/analytics`, `@vercel/speed-insights`) injetadas no `layout.tsx` e ativadas no projeto Vercel. A observabilidade da parte server (rota `/api/calendar`) vem de logs de runtime que a Vercel já captura automaticamente — só precisamos torná-los úteis com `console.log/error` estruturado.

**Tech Stack:** Next.js 14.2 (App Router), `@vercel/analytics`, `@vercel/speed-insights`, Vercel CLI / Dashboard, vitest.

---

## Contexto e suposições

- Repo: `/Users/ronan/Developer/agenda-assis`. Projeto Vercel `prj_dlGt7No4WLfmiudmIGfhuFrpgO9p`, time `team_Ua4PsQaWuz2xSojwPrEQaLQ2` (slug `rohones`). `.vercel/project.json` já existe → CLI está linkado.
- O painel é um **quiosque**: tipicamente 1 visitante único (a tela física). `page.tsx` tem `<meta http-equiv="refresh" content="300">` → a página recarrega a cada 5 min, contando 1 page view por recarga. Então Web Analytics mostrará ~1 visitante único e N page views (≈12/h). Não é tráfego humano diverso — interpretar así.
- A página carrega via `ronanrodrigo.dev/agenda-assis` (redirect GitHub Pages) → `agenda-assis.vercel.app`. O componente `<Analytics />` roda no app Vercel, então os dados são coletados normalmente.
- `VERCEL_TOKEN` e `GOOGLE_CALENDAR_API_KEY` ficam em `/Users/ronan/Developer/ronenv/.env` (não commitar). A ativação via Dashboard não precisa de token; via CLI precisa do `vercel` logado.

## O que a Vercel oferece (e o que é útil AQUI)

| Recurso | O que mede | Custo Hobby | Esforço | Útil p/ quiosque? |
|---|---|---|---|---|
| **Web Analytics** | Page views, visitantes, país, dispositivo, referrer, path | Grátis | Baixo | Baixo (1 visitante) — mas confirma se o painel está sendo servido |
| **Speed Insights** | Core Web Vitals (LCP, CLS, INP, TTFB, FCP) | Grátis | Baixo | **Alto** — mede performance do iframe do calendário na tela do quiosque |
| **Runtime Logs** | Logs stdout/stderr das funções serverless | Grátis (Dashboard) | Médio | **Alto** — o `/api/calendar` depende da API do Google; erros 502 aparecem aqui |
| **Log Drains / alertas** | Enviar logs p/ Datadog etc. | Precisa Pro | — | Adiar (não essencial) |
| **Audiences / eventos custom** | Eventos nomeados (`track()`) | Grátis | Baixo | Opcional — ex.: clique em "Abrir no Google Agenda" |

**Conclusão:** vale ligar os 3 primeiros. Web Analytics é quase de graça; Speed Insights e Logs são os de maior valor real pro quiosque.

---

## Passo a passo

### Task 1: Habilitar Web Analytics no projeto

**Objective:** Ativar a feature Web Analytics no projeto Vercel (sem código ainda).

**Opção A — Dashboard (mais simples, sem CLI):**
- Abrir https://vercel.com/rohones/agenda-assis/analytics
- Clicar em "Enable" / "Enable Web Analytics".

**Opção B — CLI:**
```bash
cd /Users/ronan/Developer/agenda-assis
vercel project web-analytics --format json
```
Expected: JSON com `"enabled": true` (ou confirmação). Se pedir login, `vercel login` primeiro (ou exporte `VERCEL_TOKEN` e use `vercel --token $VERCEL_TOKEN`).

**Step de verificação:** Dashboard mostra a aba Analytics ativa, mesmo sem dados ainda.

---

### Task 2: Instalar dependências de analytics

**Objective:** Adicionar `@vercel/analytics` e `@vercel/speed-insights` ao `package.json`.

**Files:**
- Modify: `/Users/ronan/Developer/agenda-assis/package.json`

**Step 1: Instalar**
```bash
npm install @vercel/analytics @vercel/speed-insights
```
Expected: sem erro; ambas entram em `dependencies`.

**Step 2: Verificar**
```bash
npm ls @vercel/analytics @vercel/speed-insights
```
Expected: duas linhas listando as versões instaladas.

**Step 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: add @vercel/analytics and @vercel/speed-insights deps"
```

---

### Task 3: Injetar `<Analytics />` no layout

**Objective:** Renderizar o script de Web Analytics em todas as páginas.

**Files:**
- Modify: `/Users/ronan/Developer/agenda-assis/src/app/layout.tsx`

**Step 1: Editar o layout** (substituir o arquivo atual):

```tsx
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agenda - Campanha',
  description: 'Agenda da campanha (Google Calendar)',
  applicationName: 'Agenda Campanha',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Agenda Campanha' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Analytics mode="production" />
      </body>
    </html>
  );
}
```

**Step 2: Typecheck**
```bash
npm run typecheck
```
Expected: sem erros de tipo.

**Step 3: Build smoke**
```bash
npm run build
```
Expected: build OK, sem erro de import.

**Step 4: Commit**
```bash
git add src/app/layout.tsx
git commit -m "feat: inject Vercel Web Analytics in root layout"
```

---

### Task 4: Habilitar Speed Insights no projeto

**Objective:** Ativar a feature Speed Insights no projeto Vercel.

**Opção A — Dashboard:** aba "Speed Insights" no projeto → Enable.
**Opção B — CLI:**
```bash
vercel project speed-insights --format json
```
Expected: JSON `"enabled": true`.

---

### Task 5: Injetar `<SpeedInsights />` no layout

**Objective:** Coletar Core Web Vitals da tela do quiosque.

**Files:**
- Modify: `/Users/ronan/Developer/agenda-assis/src/app/layout.tsx`

**Step 1: Editar o layout** (adicionar import + componente):

```tsx
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import SpeedInsights from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agenda - Campanha',
  description: 'Agenda da campanha (Google Calendar)',
  applicationName: 'Agenda Campanha',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Agenda Campanha' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Analytics mode="production" />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Step 2: Typecheck + build**
```bash
npm run typecheck && npm run build
```
Expected: OK.

**Step 3: Commit**
```bash
git add src/app/layout.tsx
git commit -m "feat: inject Vercel Speed Insights in root layout"
```

---

### Task 6: Logs estruturados na rota `/api/calendar`

**Objective:** Tornar a observabilidade da função serverless útil — registrar sucesso (status, tamanho) e falha (erro) de forma legível nos Runtime Logs da Vercel.

**Files:**
- Modify: `/Users/ronan/Developer/agenda-assis/src/app/api/calendar/route.ts`

**Step 1: Editar a rota** (adicionar logs JSON estruturados):

```ts
import { NextResponse } from 'next/server';
import { buildContainer } from '@/application/app-container';
import { BuildAgendaService } from '@/application/services/calendar-service';
import { toAgendaResponse } from '@/interface-adapters/http/calendar-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  try {
    const { gateway } = buildContainer();
    const view = await new BuildAgendaService(gateway).execute();
    const res = NextResponse.json(toAgendaResponse(view));
    res.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    console.log(JSON.stringify({
      level: 'info',
      route: '/api/calendar',
      status: 200,
      durationMs: Date.now() - start,
      events: view.today.length + view.currentMonth.length + view.nextMonth.length,
    }));
    return res;
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      route: '/api/calendar',
      status: 502,
      durationMs: Date.now() - start,
      error: String(err),
    }));
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
```

**Step 2: Typecheck**
```bash
npm run typecheck
```
Expected: OK.

**Step 3: Commit**
```bash
git add src/app/api/calendar/route.ts
git commit -m "observability: structured logs on /api/calendar (success + 502)"
```

> Nota: a Vercel já captura stdout/stderr como Runtime Logs — nenhuma config extra. Para ler: Dashboard → Project → Logs, ou `vercel logs --environment production --level error --since 1h`.

---

### Task 7 (Opcional): Evento custom no botão "Abrir no Google Agenda"

**Objective:** Saber quantas vezes o botão de abrir o Google Agenda é usado (útil se o quiosque for tocado por eleitores).

**Files:**
- Modify: `/Users/ronan/Developer/agenda-assis/src/app/page.tsx`
- Create (wrapper): `/Users/ronan/Developer/agenda-assis/src/lib/track.ts`
- Test: `/Users/ronan/Developer/agenda-assis/src/lib/track.test.ts`

**Step 1: Criar wrapper** (`src/lib/track.ts`):
```ts
import { track } from '@vercel/analytics';

export function trackEvent(name: string, props?: Record<string, string | number>) {
  track(name, props);
}
```

**Step 2: Escrever teste falhando** (`src/lib/track.test.ts`):
```ts
import { describe, it, expect, vi } from 'vitest';
import { track } from '@vercel/analytics';
import { trackEvent } from './track';

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }));

describe('trackEvent', () => {
  it('chama track com nome e props', () => {
    trackEvent('open_google_agenda', { source: 'kiosk' });
    expect(track).toHaveBeenCalledWith('open_google_agenda', { source: 'kiosk' });
  });
});
```

**Step 3: Rodar teste p/ confirmar pass**
```bash
npm run test -- src/lib/track.test.ts
```
Expected: 1 passed.

**Step 4: Usar no botão** (`page.tsx`): trocar o `<a>` por:
```tsx
<a className="open-btn" href="https://calendar.google.com/calendar/u/0/r/agenda/assis.capim@gmail.com"
   onClick={() => trackEvent('open_google_agenda')}>🗓️ Abrir no Google Agenda</a>
```
(importar `trackEvent` no topo de `page.tsx`).

**Step 5: Typecheck + test + commit**
```bash
npm run typecheck && npm run test && git add src/lib/track.ts src/lib/track.test.ts src/app/page.tsx && git commit -m "feat: track custom event on open-in-google-agenda button"
```

---

### Task 8: Deploy em produção e verificar

**Objective:** Publicar e confirmar que dados começam a aparecer.

**Step 1: Deploy**
```bash
vercel --prod
```
Expected: URL de produção pronta (`agenda-assis.vercel.app`).

**Step 2: Aguardar coleta**
- Abrir o painel (ou deixar o quiosque rodar) alguns minutos.
- Dashboard → Analytics: deve aparecer 1 visitante / N page views.
- Dashboard → Speed Insights: após alguns carregamentos, métricas LCP/CLS/INP.
- Dashboard → Logs: ver `level:info` em `/api/calendar` status 200; simular falha (ex.: API key inválida) p/ ver `level:error` status 502.

**Step 3: Commit final de release**
```bash
git add -A && git commit -m "release: enable Vercel analytics + speed insights + api logs" || echo "nothing to commit"
```

---

## Validação geral

- `npm run typecheck` passa em todos os passos.
- `npm run build` passa.
- `npm run test` passa (Task 7).
- Dashboard Vercel (time `rohones`, projeto `agenda-assis`) mostra Analytics, Speed Insights e Logs após o deploy.

## Riscos / tradeoffs

- **Quiosque = 1 visitante:** Web Analytics tem baixo valor de audiência; Speed Insights e Logs são os de verdadeiro retorno.
- **Auto-refresh 5 min** infla page views — esperado, não é bug.
- **Log Drains / alertas automáticos** exigem plano Pro; fora de escopo. Se quiser alerta de 502, dá pra fazer via `cronjob` ou script `vercel logs` + webhook depois.
- **Privacidade:** Web Analytics da Vercel é cookieless e não coleta PII — ok p/ LGPD de campanha política (mas o QR aponta pro domínio pessoal; sem dados pessoais coletados).
- **`mode="production"`** no `<Analytics />`: só envia dados em produção; em `dev` não polui os números.

## Perguntas em aberto

1. Quer ligar também **Log Drains** (Pro) ou alerta de erro no `/api/calendar`? (Hoje fora de escopo.)
2. Web Analytics de audiência é importante p/ vocês, ou podemos pular e focar só em Speed Insights + Logs? (Recomendo manter os 3 — custo zero.)
3. O botão "Abrir no Google Agenda" é tocado por eleitores ou só pela equipe? Define se o evento custom (Task 7) vale a pena.
