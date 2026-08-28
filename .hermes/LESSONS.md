# Lições Aprendidas — agenda-assis

> Erros recorrentes / armadilhas já pisadas neste repo. Leia antes de mexer em
> data/hora, deploy ou qualquer código que toque o calendário.

---

## 🕐 Sempre fixe o timezone em America/Sao_Paulo para todo cálculo de data/hora

**Data:** 2026-08-28

**O que aconteceu:** a seção "HOJE" do site mostrava o dia errado e os horários
~3h adiantados. O servidor roda em **UTC** (Vercel), mas o calendário da campanha
é `America/Sao_Paulo`. Todo cálculo usava os getters locais do runtime:
`getDate()`, `getMonth()`, `getFullYear()`, `toLocaleTimeString()` sem `timeZone`,
e o `fetch` na Google Calendar API não passava `timeZone`. Resultado: "Hoje"
caía em 28/ago (UTC) e não 27/ago (BRT); evento das 08:00 aparecia como 11:00.

**Como evitar:**
- Nunca use `new Date().getDate()` / `getMonth()` / `toLocaleTimeString()` soltos
  para decidir "hoje" ou formatar horário de um calendário com zona definida.
- Fixe a zona numa constante (`TIMEZONE = 'America/Sao_Paulo'`) e use
  `Intl.DateTimeFormat('pt-BR', { timeZone, hour:'2-digit', minute:'2-digit', hour12:false })`
  para horas e `Intl.DateTimeFormat('en-CA', { timeZone, year,month,day })` (formato
  `YYYY-MM-DD`) para a chave do dia civil.
- Passe `timeZone=America/Sao_Paulo` na URL da Google Calendar API — assim
  eventos multidia são cortados no limite do dia de SP, não de UTC.
- O cliente **não deve** usar o próprio relógio para "hoje": o servidor emite um
  `todayKey` (YYYY-MM-DD em SP) e a página consome esse valor como fonte única.
- A janela de busca (timeMin/timeMax) deve ser montada como instante UTC a partir
  das partes de mês de SP (`Date.UTC(y, m, 1, ...)`), para ser idêntica em qualquer host.

**Verificação que pega o bug:** rode num instant que seja 23:00 de SP mas 02:00 UTC
do dia seguinte (ex.: `new Date('2026-08-28T02:00:00Z')`). O `today` tem que ser o
dia 27, não o 28. Teste de regressão em `event.test.ts` / `calendar-service.test.ts`.

**Correção aplicada:** PR #3 (branch `fix/tz-sao-paulo-today`), mergeado no `main`.
Helpers `sp*` em `src/domain/calendar/event.ts`.

---

## 🧭 ANTES de afirmar que "está pronto", valide contra o dado real

A screenshot do calendário vs. a saída do site divergiam visivelmente. Sempre
comparar o JSON do `/api/calendar` (ou o fetch direto na API com a key real de
`/Users/ronan/Developer/ronenv/.env`) com a visão do Google Calendar antes de
declarar conserto. Não confie só nos testes unitários para bugs de zona horária.
