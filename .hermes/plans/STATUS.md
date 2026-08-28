# Status dos Planos — agenda-assis

> Atualizado a cada implementação/pedido. Formato: `status` + evidência (commit/PR/deploy).
> Legenda: ✅ done · 🟡 partial · ⬜ pending · ❌ obsoleto (decisão mudou)

---

## ✅ 2026-08-27_140000-google-calendar-custom-agenda
Página customizada da agenda via Google Calendar API (skillfold + Vercel proxy).
- **Status:** DONE
- **Evidência:** branch `feat/custom-agenda` → merge `d1df84e` no `main`; commits `8b115d6` (título do card), `0451cda`/`76f8670`/`4c56520` (header/estrela) direto no main.
- **Deploy:** Vercel `agenda-assis.vercel.app` no ar com dados reais (key em `.env.local`/Vercel env). `AGENTS.md` reescrito (`774ef8e`).

## ✅ 2026-08-27_140000-google-calendar-api-custom-page
Plano-irmão (mesmo objetivo, foco na página). Conteúdo absorvido pelo plano acima.
- **Status:** DONE (superset do `...-custom-agenda`)
- **Evidência:** implementado junto com o item anterior; código em `src/app/page.tsx` + `globals.css` + camadas skillfold.

## ⬜ 2026-08-27_203000-vercel-analytics-observability
Web Analytics + Speed Insights + structured logs no `/api/calendar`.
- **Status:** PENDING (não iniciado)
- **Notas:** 8 tasks no plano (enable dashboard features, instalar `@vercel/analytics`/`@vercel/speed-insights`, injetar no `layout.tsx`, logs estruturados na rota, deploy). Nenhuma task executada ainda.
- **Bloqueio:** nenhum óbvio; decidir se quer Log Drains/alertas (Pro) — fora de escopo.

## ❌ 2026-08-27_234500-agenda-assis-static-github-pages
Servir o app real no GitHub Pages como estático puro (sem Vercel, fetch client-side, API key no JS).
- **Status:** OBSOLETO — decisão revertida
- **Por quê:** em 2026-08-27 decidimos **manter o Vercel** como host real e o GitHub Pages apenas como *redirector* (`index.html` → `agenda-assis.vercel.app`). O plano propunha eliminar o Vercel e expor a API key no cliente, o que não foi adotado.
- **Estado atual:** `index.html` continua sendo redirector (commit `980cb33` aponta para URL estável `agenda-assis.vercel.app`). Arquitetura Next.js + Vercel segue ativa.

---

## ✅ 2026-08-28_003000-fix-tz-sao-paulo-today
Bug: seção "HOJE" mostrava dia errado e horários deslocados (~3h) por causa do timezone (servidor em UTC, calendário em America/Sao_Paulo).
- **Status:** DONE
- **Causa:** `getDate`/`getMonth`/`toLocaleTimeString` e o fetch usavam UTC do Vercel; "Hoje" caía em 28/ago e os horários vinham adiantados.
- **Correção:** `event.ts` com `TIMEZONE='America/Sao_Paulo'` + helpers `sp*` (Intl); `calendar-service` usa chaves SP para janela/divisão; gateway com `timeZone=America/Sao_Paulo`; response/`page.tsx` emitem/consomem horários SP e `todayKey` do servidor como fonte única.
- **Evidência:** branch `fix/tz-sao-paulo-today` → PR #3 (squash merge no `main`). `npm run verify:pr` verde (14 testes). Endpoint live `https://agenda-assis.vercel.app/api/calendar` retorna `timezone=America/Sao_Paulo`, `todayKey=2026-08-27` com os eventos reais do dia (Gravar programa 08:30, Saída Itajaí 12:00, Sindicato 14:00, APAE 16:00, Guaramirim 19:00) — bate com o calendário.

### Última atualização
2026-08-28 — correção de timezone (HOJE em America/Sao_Paulo) mergeada e no ar.
Próximo plano em aberto: **analytics/observabilidade Vercel** (pending).
