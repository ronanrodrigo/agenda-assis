# Google Calendar API Custom Agenda Page — Implementation Plan

> **For Hermes:** Execute task-by-task. Each task is 2-5 minutes of focused work.

**Goal:** Replace the embedded Google Calendar iframe kiosk with a standalone static page that fetches events directly from the Google Calendar API and renders them with custom branding — keeping the same kiosk/mobile UX (current + next month, QR hero, red accent, 5-min auto-refresh).

**Architecture:** A single static `index.html` that (1) loads a tiny serverless API proxy (Vercel Edge Function, no build step) to call Google Calendar API server-side, avoiding browser CORS/exposed secrets; (2) fetches current-month and next-month events at load; (3) renders events in a custom card/list layout styled with the campaign red gradient. The existing kiosk.sh launcher and all mobile/desktop UX patterns are preserved.

**Tech Stack:** Vanilla JS + HTML/CSS (no framework), Google Calendar API v3, Vercel Edge Function (Python) as the auth proxy, Google Service Account for server-side auth (avoids user OAuth flow on a kiosk device).

---

## Assumptions & Context

- The kiosk is a physical Linux box (see `kiosk.sh`) that loads `https://ronanrodrigo.dev/agenda-assis`.
- The calendar being embedded is `assis.capim@gmail.com` (publicly viewable agenda).
- Currently no build system; just `index.html`. The plan keeps it static — the only new server-side piece is a single proxy function.
- UI text is pt-BR. Red accent is `#c62828`. Kiosk app name is "Agenda Campanha".
- The page auto-refreshes every 5 minutes via `<meta http-equiv="refresh" content="300">`.

---

## Task 1: Create Google Cloud project & service account for Calendar API

**Objective:** Set up server-side OAuth credentials so the page can read the calendar without user interaction.

**Files:**
- (none in repo — this is a Google Cloud Console step)

**Steps:**
1. Go to https://console.cloud.google.com/ and create or select a project (or reuse an existing one).
2. Enable the **Google Calendar API** for that project.
3. Go to **IAM & Admin → Service Accounts** → **Create Service Account**.
   - Name: `agenda-assis-kiosk`
   - Role: none needed (will use domain-wide delegation OR the calendar must be public-read).
4. Create a key → JSON → download the file.
5. **Make `assis.capim@gmail.com` calendar publicly readable** (so the service account can read without domain delegation):
   - In Google Calendar (web UI) → Settings → Access permissions → "Make available to public" → make the calendar public. OR share the calendar with `service-account-email@project.iam.gservice.com` as "See all event details".
6. Save the service account JSON somewhere secure; it will NOT be committed to the repo.

**Verification:**
- Can read events from the calendar using the Google Calendar API Explorer with the service account.

---

## Task 2: Create the Vercel Edge Function proxy

**Objective:** A server-side proxy that calls Google Calendar API using the service account, returning JSON events. Keeps the API key/secret off the client.

**Files:**
- Create: `api/agenda.py` — Vercel Edge Function (Python).
- (The function will be deployed to `https://ronanrodrigo.dev/api/agenda` automatically by Vercel, assuming the project is linked.)

**Step 1: Write the Edge Function**

```python
import os
from datetime import datetime, timezone
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

def get_service():
    creds = service_account.Credentials.from_service_account_file(
        os.environ['CALENDAR_SERVICE_ACCOUNT_JSON_PATH'],
        scopes=SCOPES,
    )
    return build('calendar', 'v3', credentials=creds)

def handler(request):
    # Expects ?calendar_id=assis.capim@gmail.com&start=YYYY-MM-DD&end=YYYY-MM-DD
    calendar_id = request.args.get('calendar_id', 'primary')
    start = request.args.get('start')
    end = request.args.get('end')

    if not start or not end:
        return {'statusCode': 400, 'body': {'error': 'start and end query params required'}}

    service = get_service()
    events_result = service.events().list(
        calendarId=calendar_id,
        timeMin=f"{start}T00:00:00-03:00",
        timeMax=f"{end}T23:59:59-03:00",
        singleEvents=True,
        orderBy='startTime',
    ).execute()

    events = events_result.get('items', [])
    # Return plain JSON events — strip internal fields
    return {
        'statusCode': 200,
        'body': events,
    }
```

**Step 2: Configure environment**
- The function reads `CALENDAR_SERVICE_ACCOUNT_JSON_PATH` from env. On Vercel, store the service account JSON content in an env var `CALENDAR_SERVICE_ACCOUNT_JSON` and write it to `/tmp/` at startup.
- Update `api/agenda.py` to read the JSON content from env and load in-memory:

```python
import json
creds = service_account.Credentials.from_service_account_info(
    json.loads(os.environ['CALENDAR_SERVICE_ACCOUNT_JSON']),
    scopes=SCOPES,
)
```

**Step 3: Set up Vercel env vars**
- Vercel project → Settings → Environment Variables:
  - `CALENDAR_SERVICE_ACCOUNT_JSON` = the full contents of the downloaded JSON key file.

**Verification:**
- Deploy and hit `https://ronanrodrigo.dev/api/agenda?calendar_id=assis.capim@gmail.com&start=2026-08-27&end=2026-09-30` — returns JSON array of events.

---

## Task 3: Rewrite `index.html` — HTML structure

**Objective:** Replace iframe embeds with custom event containers; keep the QR hero banner and mobile button.

**Files:**
- Modify: `index.html` (rewrite the `<body>` and `<script>` sections)

**Step 1: Replace the calendar iframe markup**

Replace the entire `.calendar-container` block (lines ~189-205) with:

```html
  <div class="qr-hero">
    <div class="qr-hero-img-wrapper">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://ronanrodrigo.dev/agenda-assis" alt="QR Code - Abrir agenda no celular">
    </div>
    <div class="qr-hero-text">
      <h2>Acompanhe aqui a agenda da campanha!</h2>
      <p>Escaneie o QR code para abrir no navegador</p>
    </div>
    <span class="qr-hero-star">★</span>
  </div>

  <div class="calendar-container">
    <div class="calendar-columns">
      <div class="calendar-panel">
        <h3 class="month-label" id="currentMonthLabel"></h3>
        <div class="events-list" id="currentMonthEvents"></div>
      </div>
      <div class="calendar-panel calendar-next-panel">
        <h3 class="month-label" id="nextMonthLabel"></h3>
        <div class="events-list" id="nextMonthEvents"></div>
      </div>
    </div>
    <div class="calendar-mobile">
      <h3 class="month-label" id="mobileMonthLabel"></h3>
      <div class="events-list" id="mobileEvents"></div>
    </div>
  </div>

  <a class="open-calendar-btn" href="https://calendar.google.com/calendar/u/0/r/agenda/assis.capim@gmail.com" target="_self">
    🗓️ Abrir no Google Agenda
  </a>
```

**Step 2: Add CSS for event cards**

Add to the `<style>` block:

```css
    .calendar-panel {
      width: 50%;
      padding: 16px;
      overflow-y: auto;
      height: calc(100vh - 80px);
    }

    .calendar-next-panel {
      border-left: 1px solid #e0e0e0;
    }

    .month-label {
      font-size: 18px;
      font-weight: 700;
      color: #c62828;
      margin-bottom: 12px;
      text-align: center;
    }

    .events-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .event-card {
      background: white;
      border-left: 3px solid #c62828;
      border-radius: 6px;
      padding: 10px 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .event-card .event-title {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    .event-card .event-time {
      font-size: 12px;
      color: #666;
    }

    .event-card .event-location {
      font-size: 12px;
      color: #999;
      margin-top: 2px;
    }

    /* Mobile */
    .calendar-mobile {
      display: none;
      flex: 1;
      width: 100%;
      overflow-y: auto;
      padding: 16px;
      height: calc(100vh - 80px);
    }
```

**Step 3: Update media query**

The existing media query hides `.calendar-columns` and shows `.calendar-mobile` on ≤768px. The new structure already uses those class names, so no change needed.

**Verification:**
- Open `index.html` in a browser — QR hero, two empty month columns on desktop, single column on mobile. No iframes render.

---

## Task 4: Write the JavaScript — fetch and render events

**Objective:** Replace the iframe `src` builder script with an API-fetch + render script.

**Files:**
- Modify: `index.html` — the `<script>` block (lines ~206-246)

**Step 1: Replace the entire `<script>` block**

```javascript
(function () {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth(); // 0-indexed
  var calendarId = 'assis.capim@gmail.com';

  function fmtMonthStart(y, m) {
    return new Date(y, m, 1);
  }

  function fmtMonthEnd(y, m) {
    return new Date(y, m + 1, 0);
  }

  function dateISO(d) {
    return d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
  }

  function monthLabel(y, m) {
    var months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[m] + ' / ' + y;
  }

  function labelFor(dateStr) {
    if (!dateStr) return 'All day';
    // dateStr may be "2026-08-27" or "2026-08-27T10:00:00-03:00"
    var d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function renderEvent(e) {
    var start = e.start;
    var end = e.end;
    var startStr = start.dateTime || start.date || '';
    var endStr = end.dateTime || end.date || '';
    var timeText = labelFor(startStr);

    var el = document.createElement('div');
    el.className = 'event-card';

    var title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = e.summary || '(Sem título)';

    var time = document.createElement('div');
    time.className = 'event-time';
    time.textContent = timeText;

    el.appendChild(title);
    el.appendChild(time);

    if (e.location) {
      var loc = document.createElement('div');
      loc.className = 'event-location';
      loc.textContent = e.location;
      el.appendChild(loc);
    }

    return el;
  }

  function renderEvents(container, events) {
    container.innerHTML = '';
    if (!events || events.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'event-card';
      empty.style.background = '#fafafa';
      empty.textContent = 'Nenhum evento programado.';
      container.appendChild(empty);
      return;
    }
    events.forEach(function(e) {
      container.appendChild(renderEvent(e));
    });
  }

  function fetchMonth(y, m, containerId, labelId) {
    var start = fmtMonthStart(y, m);
    var end = fmtMonthEnd(y, m);
    var startISO = start.toISOString().slice(0, 10);
    var endISO = end.toISOString().slice(0, 10);

    document.getElementById(labelId).textContent = monthLabel(y, m);

    return fetch('/api/agenda?calendar_id=' + encodeURIComponent(calendarId) +
      '&start=' + startISO + '&end=' + endISO)
      .then(function(r) { return r.json(); })
      .then(function(events) {
        renderEvents(document.getElementById(containerId), events);
      })
      .catch(function(err) {
        console.error('Failed to fetch events:', err);
        var container = document.getElementById(containerId);
        container.innerHTML = '<div class="event-card" style="color:#c62828;">Erro ao carregar agenda.</div>';
      });
  }

  // Current month
  var currentStart = new Date(year, month, 1);
  var currentEnd = new Date(year, month + 1, 0);

  // Next month
  var nextMonth = month + 1;
  var nextYear = year;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear++;
  }

  // Fetch both months for desktop
  var currentDateISO = dateISO(currentStart);
  var currentEndISO = dateISO(currentEnd);
  var nextDateISO = dateISO(new Date(nextYear, nextMonth, 1));
  var nextEndISO = dateISO(new Date(nextYear, nextMonth + 1, 0));

  // Desktop columns
  fetch('/api/agenda?calendar_id=' + encodeURIComponent(calendarId) +
    '&start=' + currentDateISO + '&end=' + currentEndISO)
    .then(function(r) { return r.json(); })
    .then(function(events) {
      document.getElementById('currentMonthLabel').textContent = monthLabel(year, month);
      renderEvents(document.getElementById('currentMonthEvents'), events);
    });

  fetch('/api/agenda?calendar_id=' + encodeURIComponent(calendarId) +
    '&start=' + nextDateISO + '&end=' + nextEndISO)
    .then(function(r) { return r.json(); })
    .then(function(events) {
      document.getElementById('nextMonthLabel').textContent = monthLabel(nextYear, nextMonth);
      renderEvents(document.getElementById('nextMonthEvents'), events);
    });

  // Mobile — single combined fetch for current month
  fetch('/api/agenda?calendar_id=' + encodeURIComponent(calendarId) +
    '&start=' + currentDateISO + '&end=' + currentEndISO)
    .then(function(r) { return r.json(); })
    .then(function(events) {
      document.getElementById('mobileMonthLabel').textContent = monthLabel(year, month);
      renderEvents(document.getElementById('mobileEvents'), events);
    });
})();
```

**Step 2: Remove iframe-specific CSS**

Remove the `.calendar-iframe-wrapper`, `.calendar-iframe-wrapper iframe`, `.calendar-current`, `.calendar-next` CSS rules — they're no longer needed.

**Verification:**
- When served with the API proxy, the page renders actual event cards in the two desktop columns and the mobile view shows the current month.
- On desktop: two columns, each labeled with the month name.
- On mobile: single column, "Abrir no Google Agenda" button visible.

---

## Task 5: Verify mobile behavior & kiosk launch

**Objective:** Ensure the mobile breakpoint still works and the kiosk launcher is unaffected.

**Files:**
- No changes needed — `kiosk.sh` still launches `https://ronanrodrigo.dev/agenda-assis`.

**Steps:**
1. Open the page on a phone-width viewport — confirm only `.calendar-mobile` is visible, `.calendar-columns` is hidden, `.open-calendar-btn` is shown.
2. Confirm the 5-minute `<meta http-equiv="refresh" content="300">` is still present in `<head>`.
3. On the kiosk Linux box, verify Chromium loads the page and renders event cards.

**Verification:**
- Mobile viewport shows single column with events; "Abrir no Google Agenda" button is fixed at the bottom.

---

## Summary of Files Changed

| File | Action | Description |
|------|--------|-------------|
| `index.html` | Modify | Rewrite body structure, CSS, and JS to use API + custom rendering instead of iframes |
| `api/agenda.py` | Create | Vercel Edge Function proxy to Google Calendar API |

## Risks & Tradeoffs

- **Service account auth:** Google requires either making the calendar public OR sharing the service account email with the calendar. If the calendar is not public, sharing must be set up manually.
- **Vercel deployment:** The `api/` folder must be in the Vercel project for the Edge Function to deploy. If `ronanrodrigo.dev` is not a Vercel-hosted site, a different serverless platform (Netlify, Cloudflare Workers) would be needed — the function code would change slightly per provider.
- **No build step preserved:** The function uses `google-api-python3` — it needs `requirements.txt` or a `pyproject.toml` at the Vercel project root. Since the current repo has no build system, this adds a small dependency manifest.
- **Auto-refresh:** Every 5 minutes, the full page reloads and re-fetches events. This is retained from the original design — a background-fetch approach would be smoother but adds complexity.
