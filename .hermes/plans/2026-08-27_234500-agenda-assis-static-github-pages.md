# Agenda Assis: Vercel only (sem GitHub Pages) em agenda-assis.ronanrodrigo.dev

> **For Hermes:** Usar subagent-driven-development para executar task a task. Mensagens em pt-BR.

**Goal:** Tirar o repositório `agenda-assis` do GitHub Pages e hospedar a agenda **apenas no Vercel**, sob o subdomínio dedicado `agenda-assis.ronanrodrigo.dev`. O redirect atual (`ronanrodrigo.dev/agenda-assis/` servido pelo GH Pages) some. `/`, `/notes/` e `/lab/` continuam no GitHub Pages (inalterados).

**Architecture:** O app Next.js já está no Vercel (project `agenda-assis`, `prj_dlGt7No4WLfmiudmIGfhuFrpgO9p`, team `rohones`). Hoje ele só é acessível via `*.vercel.app` (URLs com hash de deploy) porque o path `ronanrodrigo.dev/agenda-assis/` é servido pelo GH Pages. Mudamos para um **subdomínio próprio** `agenda-assis.ronanrodrigo.dev` (CNAME → Vercel), desativamos o GH Pages desse repo e apontamos `kiosk.sh` + QR para a nova URL. Sem mudar o apex `ronanrodrigo.dev`: o subdomínio é independente do A record da raiz.

**Tech Stack:** Next.js 14 (já existente) + Vercel. DNS Squarespace (1 CNAME novo). Sem alteração de código da agenda além de 2 strings de URL.

---

## Estado atual (verificado, read-only)

- **Vercel** (`mcp__vercel__get_project`): projeto `agenda-assis`, framework nextjs, team `rohones` (`team_Ua4PsQaWuz2xSojwPrEQaLQ2`). Domínios atuais: `agenda-assis.vercel.app`, `agenda-assis-rohones.vercel.app`, `agenda-assis-git-main-rohones.vercel.app`. Latest deploy READY.
- **GitHub Pages** (`gh api repos/ronanrodrigo/agenda-assis/pages`): `html_url: http://ronanrodrigo.dev/agenda-assis/`, `source: {branch: main, path: /}`, `build_type: legacy`, `cname: null`. **É ele quem serve o redirect hoje.** A raiz tem um `index.html` (stub de redirect) — não usado pelo Vercel (Vercel builda `src/app`).
- **DNS (Squarespace, print):** `A @ → 185.199.108.153` (GitHub Pages), `CNAME www → ronanrodrigo.github.io`, iCloud Mail, TXT de verificação Apple. **Não há registro `agenda-assis`.** Subdomínios são independentes do apex, então adicionar `agenda-assis` CNAME → Vercel não toca `/`, `/notes/`, `/lab/`.
- **Live:** `ronanrodrigo.dev/agenda-assis/` → 200 (redirect stub). `/`, `/notes/`, `/lab/` → 200 (GH Pages de outros repos).
- **Código que aponta para o path antigo:**
  - `kiosk.sh:13` → `CALENDAR_URL="https://ronanrodrigo.dev/agenda-assis"`
  - `src/app/page.tsx:101` → QR `data=https://ronanrodrigo.dev/agenda-assis`
- **CORS Google Calendar:** confirmado funcionando (200 + `access-control-allow-origin: https://ronanrodrigo.dev`). Como o app fica no **subdomínio**, a origem vira `https://agenda-assis.ronanrodrigo.dev` — precisa confirmar/liberar CORS para o novo subdomínio no deploy (ver Task 4/validação).

---

## Tasks

### Task 1: Adicionar domínio `agenda-assis.ronanrodrigo.dev` no Vercel
**Objective:** Reservar o subdomínio no projeto Vercel e obter os registros DNS de verificação.
**Step:** Via Vercel (MCP `vercel domains add` ou dashboard do projeto `agenda-assis`, team `rohones`): adicionar `agenda-assis.ronanrodrigo.dev`. O Vercel retorna o registro de verificação — tipicamente:
- `CNAME agenda-assis → cname.vercel-dns.com` (roteamento)
- possivelmente um `_vercel` TXT ou similar para provar posse.
**Verify:** domínio aparece em `get_project` → `domains` e estado de verificação volta como "pending/valid" após o DNS (Task 2).

### Task 2: Adicionar CNAME no Squarespace (DNS)
**Objective:** Apontar o subdomínio para a Vercel.
**Files:** Squarespace DNS → "Registros personalizados" → Adicionar:
- Tipo: `CNAME`
- Hostname (Nome): `agenda-assis`
- Valor (Dados): `cname.vercel-dns.com`
- TTL: `4 horas` (igual aos demais)
**Step:** Adicionar também qualquer TXT `_vercel` que o Vercel tenha pedido na Task 1.
**Verify:** `dig +short CNAME agenda-assis.ronanrodrigo.dev` → `cname.vercel-dns.com.` (pode levar alguns min/horas para propagar).

### Task 3: Desativar GitHub Pages do repositório `agenda-assis`
**Objective:** Acabar com o `ronanrodrigo.dev/agenda-assis/` (e seu redirect) servido pelo GH Pages.
**Step:** `gh api -X PUT repos/ronanrodrigo/agenda-assis/pages -f '{"source":{"branch":"main","path":"/"}}'` não desativa; para **desativar** usar:
```bash
gh api -X DELETE repos/ronanrodrigo/agenda-assis/pages
```
(requer permissão admin no repo; se não tiver, pedir ao Ronan ou fazer pelo Settings → Pages → "Remove").
**Verify:** `gh api repos/ronanrodrigo/agenda-assis/pages` → 404. E `curl -sI https://ronanrodrigo.dev/agenda-assis/` eventualmente para de responder 200 (pode levar cache do Pages; aguardar).

### Task 4: Remover o `index.html` de redirect do repo e ajustar AGENTS.md
**Objective:** Repo vira só o app Next.js; eliminar o stub de redirect.
**Files:**
- Delete `index.html` (raiz) — é o stub `<meta http-equiv="refresh" ... vercel.app>`.
- Modify `AGENTS.md`: remover a frase "No CI / no deploy pipeline… The live page is https://ronanrodrigo.dev/agenda-assis and is deployed manually" e a nota sobre redirect/Pages. Registrar: deploy é Vercel (push na `main` → build automático); URL oficial `https://agenda-assis.ronanrodrigo.dev`; `/agenda-assis/` no GH Pages foi desativado.
**Verify:** `ls index.html` → not found; `grep -c "http-equiv" index.html` → 0; `grep -c "ronanrodrigo.dev/agenda-assis" AGENTS.md` → 0.

### Task 5: Apontar `kiosk.sh` e QR para o novo subdomínio
**Objective:** O kiosk e o QR code abrem a URL Vercel certa.
**Files:**
- Modify `kiosk.sh:13` → `CALENDAR_URL="https://agenda-assis.ronanrodrigo.dev"`
- Modify `src/app/page.tsx:101` → QR `data=https://agenda-assis.ronanrodrigo.dev`
**Verify:** `grep -n "agenda-assis.ronanrodrigo.dev" kiosk.sh src/app/page.tsx` → 2 matches.

### Task 6: Commit + push na `main` (dispara build Vercel)
**Objective:** Publicar a nova versão no Vercel.
**Step:**
```bash
git add -A
git commit -m "feat: mover agenda-assis para Vercel em agenda-assis.ronanrodrigo.dev"
git push origin main
```
**Verify:** `gh run list` (Vercel deploy) ou `vercel` mostra deploy READY; `get_project.latestDeployment.url` atualiza.

### Task 7: Validar produção e não quebrar os outros
**Objective:** Confirmar que a agenda está no ar no subdomínio e que `/`, `/notes/`, `/lab/` continuam.
**Step:**
```bash
echo "=== nova agenda (Vercel) ==="
curl -sI https://agenda-assis.ronanrodrigo.dev/ | head -1   # esperado HTTP/2 200
curl -s https://agenda-assis.ronanrodrigo.dev/ | grep -o 'Acompanhe aqui a agenda' | head -1  # match
echo "=== CORS do novo subdomínio (Google Calendar) ==="
curl -s -D - -o /dev/null -H "Origin: https://agenda-assis.ronanrodrigo.dev" \
  "https://www.googleapis.com/calendar/v3/calendars/assis.capim%40gmail.com/events?key=KEY&maxResults=1" \
  | grep -i "access-control-allow-origin"   # esperado: https://agenda-assis.ronanrodrigo.dev
echo "=== GH Pages intactos (não mexidos) ==="
curl -sI https://ronanrodrigo.dev/ | head -1        # 200
curl -sI https://ronanrodrigo.dev/notes/ | head -1  # 200
curl -sI https://ronanrodrigo.dev/lab/ | head -1    # 200
```
**Verify:** subdomínio 200 + marcação da agenda; cabeçalho CORS libera o novo subdomínio (senão, ajustar restrição de chave no Google Cloud para incluir `https://agenda-assis.ronanrodrigo.dev/*`); os 3 paths do apex seguem 200.

---

## Riscos / trade-offs

1. **`ronanrodrigo.dev/agenda-assis/` some.** Após desativar GH Pages, qualquer bookmark/link antigo para esse path para de funcionar (404). Mitigação: só o kiosk e o QR usavam esse path, e ambos são atualizados na Task 5. Se quiser, dá pra manter um HTML de redirect mínimo em GH Pages — mas isso contradiz "Vercel only", então default é deixar 404.
2. **CORS no novo subdomínio.** O teste anterior foi com origem `ronanrodrigo.dev`. Com o app em `agenda-assis.ronanrodrigo.dev`, a origem muda. Google Calendar API retorna `access-control-allow-origin` igual à origem da request quando a chave é do tipo browser e sem restrição de referrer — então deve continuar liberado. Se a chave estiver travada por referrer `ronanrodrigo.dev/*`, **precisa** adicionar `https://agenda-assis.ronanrodrigo.dev/*` no Google Cloud Console (Task 7 valida).
3. **Propagação de DNS.** CNAME pode levar de minutos a algumas horas. Vercel mostra o domínio como "Valid" quando confirmar.
4. **Permissão para `gh api DELETE pages`.** Pode exigir admin do repo. Se falhar, fazer pelo GitHub Settings (repo → Pages → Remove) e seguir.

## Validação final
- `https://agenda-assis.ronanrodrigo.dev/` abre a agenda real (Next.js), sem redirect.
- `kiosk.sh` e QR apontam para `agenda-assis.ronanrodrigo.dev`.
- `ronanrodrigo.dev/agenda-assis/` sem GH Pages (não serve mais redirect).
- `/`, `/notes/`, `/lab/` seguem 200 no GH Pages.
- Repositório sem `index.html` de redirect; deploy = push na `main` (Vercel).
