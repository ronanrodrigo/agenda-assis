# Agenda Assis: repo público (redirect) + repo privado `assis` (app no Vercel) em `assis.ronanrodrigo.dev`

> **For Hermes:** Não há skill `subagent-driven-development` neste ambiente. Para executar: abrir um chat com cwd = `/Users/ronan/Developer/agenda-assis` (ou `hermes chat --in /Users/ronan/Developer/agenda-assis`) e pedir "execute .hermes/plans/2026-08-27_234500-agenda-assis-static-github-pages.md task a task". Mensagens em pt-BR. Executar sequencialmente (Task 4/5/8 dependem de segredos em `ronenv/.env` e de DNS interativo — não paralelizar cegamente).

**Goal:** Reorganizar a hospedagem da agenda — o repositório `agenda-assis` **continua público** e passa a conter apenas o `index.html` redirecionando para `https://assis.ronanrodrigo.dev`; um **novo repositório privado `assis`** recebe o app completo e ganha seu próprio projeto Vercel apontando para o subdomínio `assis.ronanrodrigo.dev`. O Vercel atual (`agenda-assis`) fica **inalterado** até o Ronan pedir desativação. Toda referência de URL usa `assis.ronanrodrigo.dev` (não `agenda-assis.ronanrodrigo.dev`).

**Architecture:** Espelha-se o conteúdo deste repo (exceto `.git`/`.env.local`/build artifacts) para um novo repo privado `ronanrodrigo/assis`. Esse novo repo vira o canônico de desenvolvimento e é conectado a um novo projeto Vercel (`assis`, team `rohones`) com domínio `assis.ronanrodrigo.dev` (CNAME → Vercel). O repo `agenda-assis` (público) mantém o `index.html` como redirector para o novo subdomínio via GitHub Pages; seu app Vercel existente continua no ar. Duas origens distintas: `assis.ronanrodrigo.dev` (novo, privado) e `agenda-assis.vercel.app` (antigo, público, mantido).

**Tech Stack:** Next.js 14 (já existente) + Vercel (novo projeto) + GitHub (repo privado novo) + DNS Squarespace (1 CNAME novo). Sem alteração de lógica da agenda além de strings de URL e do `index.html` de redirect.

---

## Decisão vs. o plano anterior (obsoleto)

O plano anterior (este arquivo) propunha mover tudo para `agenda-assis.ronanrodrigo.dev` e desligar o GitHub Pages. Decisão revertida em 2026-08-28:
- **Não** cria-se o subdomínio `agenda-assis.ronanrodrigo.dev`.
- Cria-se o subdomínio **`assis.ronanrodrigo.dev`** atrelado a um **novo repo privado `assis`**.
- O repo `agenda-assis` **segue público** e vira apenas um stub de redirect (`index.html` → `assis.ronanrodrigo.dev`), mantendo o GitHub Pages ligado.
- O projeto Vercel `agenda-assis` **não é tocado** (continua servindo `agenda-assis.vercel.app`).

---

## Estado atual (verificado, read-only)

- **Repo local:** `/Users/ronan/Developer/agenda-assis`, remote `git@github.com:ronanrodrigo/agenda-assis.git`, branch `main`.
- **`index.html` (raiz):** stub `<meta http-equiv="refresh" content="0; url=https://agenda-assis.vercel.app">` + `<script>window.location.replace('https://agenda-assis.vercel.app')</script>`. É o que o GitHub Pages serve hoje em `ronanrodrigo.dev/agenda-assis/`.
- **GitHub Pages:** habilitado no repo `agenda-assis` (`ronanrodrigo.dev/agenda-assis/`). **Mantê-lo ligado** — é o redirector público.
- **Vercel atual:** projeto `agenda-assis` (team `rohones`), domínios `agenda-assis.vercel.app` etc. **Não mexer.**
- **Strings apontando para o path antigo (a substituir por `assis.ronanrodrigo.dev`):**
  - `index.html` (redirect) → `https://agenda-assis.vercel.app`
  - `kiosk.sh:13` → `CALENDAR_URL="https://ronanrodrigo.dev/agenda-assis"`
  - `src/app/page.tsx:124` → QR `data=https://ronanrodrigo.dev/agenda-assis`
  - `agenda-prototype.html:101` → QR `data=https://ronanrodrigo.dev/agenda-assis`
  - `hero-prototype.html:91` → QR `data=https://ronanrodrigo.dev/agenda-assis`
- **`.env.example`:** não existe no repo (AGENTS.md o menciona, mas está ausente). O novo repo privado deve ganhar um `.env.example` com os nomes das vars (sem valores).
- **Secrets:** `GOOGLE_CALENDAR_API_KEY` e `VERCEL_TOKEN` ficam em `/Users/ronan/Developer/ronenv/.env` — ler via shell, **nunca imprimir/commitar**.
- **CORS Google Calendar:** hoje liberado para `ronanrodrigo.dev`. Com o app em `assis.ronanrodrigo.dev` a origem muda → validar/liberar no deploy (Task 8).

---

## Visão-alvo (topologia final)

```
                    ┌─ repo agenda-assis (PÚBLICO, GitHub Pages)
ronanrodrigo.dev ───┤     index.html ──redirect──┐
/agenda-assis/      └────────────────────────────┤
                                                  ▼
                                          assis.ronanrodrigo.dev
                                                  │ CNAME → Vercel
                                                  ▼
                    ┌─ repo assis (PRIVADO) ──► projeto Vercel "assis" (team rohones)
                    │     app Next.js completo
                    │
                    └─ (antigo) projeto Vercel "agenda-assis" ──► agenda-assis.vercel.app  (INTACTO)
```

---

## Tasks

### Task 1: Criar o novo repositório privado `assis`
**Objective:** Ter o repo privado vazio onde o app será espelhado.
**Step:** (precisa de auth `gh` configurado)
```bash
gh repo create ronanrodrigo/assis --private --description "Agenda Campanha (app privado, espelho de agenda-assis)"
```
**Verify:** `gh repo view ronanrodrigo/assis --json name,visibility,isPrivate` → `isPrivate: true`.

### Task 2: Clonar o novo repo e copiar o conteúdo do app (sem segredos/build)
**Objective:** Popular o repo privado com o app completo, preservando história futura.
**Step:**
```bash
# clona vazio
git clone git@github.com:ronanrodrigo/assis.git /Users/ronan/Developer/assis
# copia conteúdo do repo atual, EXCLUINDO .git, segredos e artefatos de build
rsync -a --delete \
  --exclude='.git' --exclude='.freebuff' --exclude='node_modules' \
  --exclude='.next' --exclude='.vercel' --exclude='.env.local' --exclude='.env*.local' \
  /Users/ronan/Developer/agenda-assis/ /Users/ronan/Developer/assis/
```
**Verify:** `ls /Users/ronan/Developer/assis` mostra `src/`, `package.json`, `kiosk.sh`, `index.html`, etc. `ls /Users/ronan/Developer/assis/.env.local` → not found. `git -C /Users/ronan/Developer/assis status` mostra arquivos a adicionar (sem `.env.local`).

### Task 2b: Registrar o novo repo `assis` como Project no Hermes
**Objective:** Ancorar o repo privado `assis` na estrutura de Projects do Hermes Desktop (agrupa sessão, traz a `AGENTS.md` dele para contexto, fixa o cwd).
**Step:** (o folder `/Users/ronan/Developer/assis` já existe após a Task 2)
```bash
hermes project create "Agenda Assis (privado)" /Users/ronan/Developer/assis --primary /Users/ronan/Developer/assis --description "App privado da Agenda Campanha (espelho de agenda-assis) — Vercel assis.ronanrodrigo.dev" --use
```
- `name` = rótulo humano ("Agenda Assis (privado)").
- `folders` = caminho do repo (primeiro vira primary; `--primary` reforça).
- `--use` já ativa o project na sessão atual.
**Verify:** `hermes project ls` lista o project; `hermes project show "Agenda Assis (privado)"` mostra `primary: /Users/ronan/Developer/assis` e o repo git apontando para `ronanrodrigo/assis`.
**Nota:** o repo `agenda-assis` (público) pode continuar como project separado no Hermes, se já existir — não remover. Este Task cria apenas o project do privado `assis`.

### Task 3: No novo repo, apontar tudo para `assis.ronanrodrigo.dev` + criar `.env.example`
**Objective:** Garantir que o app privado e o redirect usem o novo subdomínio; documentar vars de ambiente.
**Files (editar em `/Users/ronan/Developer/assis/`):**
- `index.html` — substituir o conteúdo pelo stub de redirect abaixo (target `https://assis.ronanrodrigo.dev`).
- `kiosk.sh:13` → `CALENDAR_URL="https://assis.ronanrodrigo.dev"`
- `src/app/page.tsx:124` → QR `data=https://assis.ronanrodrigo.dev`
- `agenda-prototype.html:101` → QR `data=https://assis.ronanrodrigo.dev`
- `hero-prototype.html:91` → QR `data=https://assis.ronanrodrigo.dev`
- Create: `.env.example` (conteúdo abaixo, sem valores).

Novo `index.html` (redirect-only):
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agenda Campanha — Redirecionando…</title>
  <meta http-equiv="refresh" content="0; url=https://assis.ronanrodrigo.dev">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f7f3ec; color: #2b2118; display: flex; align-items: center;
      justify-content: center; text-align: center; }
    .box { background: #fffdf9; border: 1px solid #e7ded1; border-radius: 12px;
      padding: 32px 40px; box-shadow: 0 2px 12px rgba(43,33,24,.08); max-width: 400px; }
    h1 { font-size: 20px; margin-bottom: 12px; color: #8c2f2c; }
    p { font-size: 14px; color: #4a3f33; margin-bottom: 16px; line-height: 1.5; }
    a { display: inline-block; background: #8c2f2c; color: #f7f3ec; text-decoration: none;
      padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    a:hover { background: #6e2422; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Agenda Campanha</h1>
    <p>Redirecionando para o site da agenda…</p>
    <a href="https://assis.ronanrodrigo.dev">Abrir agenda</a>
  </div>
  <script>window.location.replace('https://assis.ronanrodrigo.dev');</script>
</body>
</html>
```
`.env.example`:
```dotenv
# Copie para .env.local e preencha (NUNCA commite o .env.local)
GOOGLE_CALENDAR_API_KEY=
GOOGLE_CALENDAR_ID=assis.capim@gmail.com
```
**Verify:**
```bash
cd /Users/ronan/Developer/assis
grep -rn "ronanrodrigo.dev/agenda-assis" . --include=*.sh --include=*.tsx --include=*.html || echo "OK: nenhum resto de /agenda-assis"
grep -rn "agenda-assis.ronanrodrigo.dev" . || echo "OK: nenhum resto de agenda-assis.ronanrodrigo.dev"
grep -rn "assis.ronanrodrigo.dev" kiosk.sh src/app/page.tsx agenda-prototype.html hero-prototype.html index.html
```

### Task 4: Configurar o projeto Vercel para o repo privado `assis`
**Objective:** Conectar o novo repo a um projeto Vercel próprio e prover segredos + domínio.
**Step:**
1. Autenticar CLI (token em `ronenv/.env`): `vercel login` ou exportar `VERCEL_TOKEN` e usar `vercel link`/import.
2. Criar/importar projeto **`assis`** na **team `rohones`** a partir de `ronanrodrigo/assis` (private). Pelo dashboard Vercel ou `vercel import`/`vercel projects add`.
3. Definir env vars (ler valores de `/Users/ronan/Developer/ronenv/.env`, sem imprimir):
   - `GOOGLE_CALENDAR_API_KEY` = <valor do ronenv>
   - `GOOGLE_CALENDAR_ID` = `assis.capim@gmail.com`
   - Desabilitar **Deployment Protection** (kiosk público — ver AGENTS.md).
4. Adicionar domínio `assis.ronanrodrigo.dev` ao projeto. O Vercel retorna o registro de verificação:
   - `CNAME assis → cname.vercel-dns.com`
   - possivelmente um TXT `_vercel` para prova de posse.
**Verify:** dashboard/CLI do projeto `assis` lista domínio `assis.ronanrodrigo.dev` (estado pending/valid após DNS); env vars presentes; Deployment Protection off.

### Task 5: Adicionar CNAME `assis` no Squarespace (DNS)
**Objective:** Apontar o subdomínio para a Vercel.
**Step:** Squarespace DNS → "Registros personalizados" → Adicionar:
- Tipo: `CNAME`
- Hostname (Nome): `assis`
- Valor (Dados): `cname.vercel-dns.com`
- TTL: `4 horas` (igual aos demais)
- + qualquer TXT `_vercel` que o Vercel pediu na Task 4.
**Verify:** `dig +short CNAME assis.ronanrodrigo.dev` → `cname.vercel-dns.com.` (propagação pode levar min/horas).

### Task 6: Commit + push inicial no repo privado (dispara build Vercel)
**Objective:** Publicar a primeira versão no novo Vercel.
**Step:**
```bash
cd /Users/ronan/Developer/assis
git add -A
git commit -m "feat: app completo em repo privado assis; redirect + URLs para assis.ronanrodrigo.dev"
git push origin main
```
**Verify:** Vercel mostra deploy READY para `assis`; `latestDeployment.url` aponta para `assis.vercel.app` (preview) e, após DNS, `assis.ronanrodrigo.dev`.

### Task 7: Atualizar o repo PÚBLICO `agenda-assis` (apenas o redirect) — SEM mexer no Vercel atual
**Objective:** O repo público continua servindo o redirect, agora para o novo subdomínio. **Não remover o app do repo** (o Vercel `agenda-assis` ainda builda a partir dele).
**Files (editar em `/Users/ronan/Developer/agenda-assis/`):**
- `index.html` → mesmo stub de redirect da Task 3, target `https://assis.ronanrodrigo.dev`.
- Opcional: ajustar `AGENTS.md` (remover nota de que o redirect aponta para `agenda-assis.vercel.app`; registrar que agora aponta para `assis.ronanrodrigo.dev` e que o canônico é o repo privado `assis`).
**Step:** commit + push na `main` do `agenda-assis`. O GitHub Pages reconstroi o `index.html`; o Vercel `agenda-assis` reconstrói o app (inalterado).
```bash
cd /Users/ronan/Developer/agenda-assis
git add index.html AGENTS.md
git commit -m "chore: redirect público aponta para assis.ronanrodrigo.dev"
git push origin main
```
**⚠️ Não fazer:** `git rm -r src/ package.json ...` nem desconectar o Vercel `agenda-assis` — isso quebraria o deploy atual antes da desativação solicitada.
**Verify:** `grep -n "assis.ronanrodrigo.dev" index.html` → match; `gh repo view ronanrodrigo/agenda-assis --json isPrivate` → `false` (permanece público); `gh api repos/ronanrodrigo/agenda-assis/pages` → ainda 200 (GH Pages ligado).

### Task 8: Validar produção (novo domínio) e não quebrar o existente
**Objective:** Confirmar `assis.ronanrodrigo.dev` no ar e o Vercel antigo intacto.
**Step:**
```bash
echo "=== nova agenda (repo privado -> Vercel) ==="
curl -sI https://assis.ronanrodrigo.dev/ | head -1            # HTTP/2 200
curl -s https://assis.ronanrodrigo.dev/ | grep -o 'Acompanhe aqui a agenda' | head -1  # match

echo "=== redirect público (GH Pages) ==="
curl -sI https://ronanrodrigo.dev/agenda-assis/ | head -1     # 200
curl -s https://ronanrodrigo.dev/agenda-assis/ | grep -o 'assis.ronanrodrigo.dev' | head -1  # match no redirect

echo "=== CORS do novo subdomínio (Google Calendar) ==="
curl -s -D - -o /dev/null -H "Origin: https://assis.ronanrodrigo.dev" \
  "https://www.googleapis.com/calendar/v3/calendars/assis.capim%40gmail.com/events?key=KEY&maxResults=1" \
  | grep -i "access-control-allow-origin"   # esperado: https://assis.ronanrodrigo.dev

echo "=== Vercel ANTIGO intacto (não mexido) ==="
curl -sI https://agenda-assis.vercel.app/ | head -1          # 200
```
**Verify:** `assis.ronanrodrigo.dev` 200 + marcação da agenda; redirect público aponta para `assis.ronanrodrigo.dev`; CORS libera o novo subdomínio (senão, adicionar `https://assis.ronanrodrigo.dev/*` na restrição de chave do Google Cloud); `agenda-assis.vercel.app` segue 200.

### Task 9: Atualizar `.hermes/plans/STATUS.md`
**Objective:** Registrar o novo plano como ativo e obsoletar a entrada antiga confusa.
**Step:** No `STATUS.md`, marcar a entrada anterior deste arquivo como ❌ obsoleto (decisão de 2026-08-28: split público/privado) e adicionar:
```
## 🟡 2026-08-27_234500-agenda-assis-static-github-pages  (REESCRITO 2026-08-28)
Split: repo público agenda-assis = redirect-only p/ assis.ronanrodrigo.dev; repo privado assis = app + Vercel próprio. Vercel agenda-assis intacto.
- Status: PENDING
```
**Verify:** `grep -c "assis.ronanrodrigo.dev" .hermes/plans/STATUS.md` ≥ 1.

---

## Riscos / trade-offs

1. **Repo público `agenda-assis` continua com o app.** Ele não é mais o canônico (o privado `assis` é), mas o Vercel `agenda-assis` ainda builda a partir dele — exatamente o desejado ("manter o projeto atual até desativação"). Não remover `src/` dele (quebraria o deploy).
2. **CORS no novo subdomínio.** Origem muda de `ronanrodrigo.dev` para `assis.ronanrodrigo.dev`. Google Calendar retorna `access-control-allow-origin` igual à origem quando a chave é browser e sem restrição de referrer — deve continuar liberado; se a chave estiver travada por referrer, adicionar `https://assis.ronanrodrigo.dev/*` no GCP (Task 8 valida).
3. **Propagação de DNS.** CNAME pode levar minutos→horas; Vercel marca "Valid" ao confirmar.
4. **Permissão de repo privado + Vercel token.** Criar repo privado e linkar Vercel exigem escopo; `VERCEL_TOKEN` está em `ronenv/.env`. Se faltar permissão, pedir ao Ronan.
5. **`.env.local` não deve ir para nenhum repo.** O `rsync` da Task 2 exclui `.env.local`/`.env*.local`; o `.env.example` (sem valores) é o que vai para o privado.
6. **`agenda-assis.ronanrodrigo.dev` não existe.** Decisão: usar `assis.ronanrodrigo.dev`. Nenhum registro `agenda-assis` é criado.

## Validação final
- `https://assis.ronanrodrigo.dev/` abre a agenda real (Next.js, repo privado `assis`).
- `https://ronanrodrigo.dev/agenda-assis/` (GH Pages, repo público) redireciona para `assis.ronanrodrigo.dev`.
- `kiosk.sh`, QR (`page.tsx`) e protótipos apontam para `assis.ronanrodrigo.dev`.
- `agenda-assis.vercel.app` segue 200 (Vercel antigo inalterado).
- Repo `agenda-assis` segue **público**; repo `assis` é **privado** com o app completo.
- Sem segredos em nenhum repo (`.env.local` fora do git nos dois).
