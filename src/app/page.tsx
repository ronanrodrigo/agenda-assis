'use client';

import { useEffect, useState } from 'react';
import { Sunrise, Sun, Moon } from 'lucide-react';

interface Appt { id: string; time: string; title: string; location: string }
interface MonthEvent { id: string; day: number; mon: string; title: string; time: string; location: string }
interface AgendaResponse {
  timezone: string;
  todayKey: string; // YYYY-MM-DD in America/Sao_Paulo — source of truth for "today"
  today: Appt[];
  currentMonth: MonthEvent[];
  nextMonth: MonthEvent[];
}

const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTHS_IDX: Record<string, number> = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
const WEEK = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const WEEK_FULL = ['Domingo', 'Segunda Feira', 'Terça Feira', 'Quarta Feira', 'Quinta Feira', 'Sexta Feira', 'Sábado'];
const PERIODS = ['Manhã', 'Tarde', 'Noite'] as const;
type Period = typeof PERIODS[number];
/** Period icons (free, lightweight SVG). Logic keys stay emoji-free (periodOf match). */
const PERIOD_ICON: Record<Period, typeof Sunrise> = {
  'Manhã': Sunrise,
  'Tarde': Sun,
  'Noite': Moon,
};

function periodOf(time: string): Period {
  const h = parseInt(time.slice(0, 2), 10);
  if (Number.isNaN(h)) return 'Manhã';
  return h < 12 ? 'Manhã' : h < 18 ? 'Tarde' : 'Noite';
}

/** Build a local Date pinned to a YYYY-MM-DD (civil date, no TZ drift). */
function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function byDay(list: MonthEvent[]) {
  const map = new Map<number, MonthEvent[]>();
  for (const e of list) {
    const arr = map.get(e.day) ?? [];
    arr.push(e);
    map.set(e.day, arr);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([day, items]) => ({ day, items }));
}

function renderDayCard(g: { day: number; items: MonthEvent[] }, year: number) {
  const d = new Date(year, MONTHS_IDX[g.items[0].mon], g.day);
  const monthName = MONTHS_FULL[d.getMonth()];
  const weekdayFull = WEEK_FULL[d.getDay()];
  return (
    <section className="day-group" key={g.day}>
      <div className="day-card">
        <div className="day-head">
          <span className="dnum">{g.day}/{monthName}</span>
          <span className="dweek">{weekdayFull}</span>
        </div>
        <ul className="day-list">
          {g.items.map((e) => (
            <li key={e.id}>
              <span className="time">{e.time}</span>
              <span className="ev-body">
                <span className="ev-title">{e.title}</span>
                {e.location && <div className="ev-loc">{e.location}</div>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Page() {
  const [data, setData] = useState<AgendaResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // "today" comes from the server (America/Sao_Paulo) — NOT the client's clock.
  const nowKey = data?.todayKey || '';
  const nowDate = nowKey ? dateFromKey(nowKey) : new Date();
  const curY = nowDate.getFullYear();
  const curM = nowDate.getMonth();
  const curD = nowDate.getDate();
  const nextY = curM === 11 ? curY + 1 : curY;

  const todayLabel = `Hoje · ${curD} ${MONTHS_FULL[curM].slice(0, 3)}`;
  const curLabel = `${MONTHS_FULL[curM]} ${curY}`;
  const nextLabel = `${MONTHS_FULL[(curM + 1) % 12]} ${nextY}`;

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/calendar');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = (await res.json()) as AgendaResponse;
        if (alive) setData(json);
      } catch (e) {
        if (alive) setErr(String(e));
      }
    }
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return (
    <>
      <header className="hero">
        <div className="hero-qr">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://ronanrodrigo.dev/agenda-assis" alt="QR Code" />
        </div>
        <div className="hero-text">
          <h1>Acompanhe aqui a agenda da campanha!</h1>
          <p>Escaneie o QR code para abrir no navegador</p>
        </div>
        <span className="hero-star">★</span>
      </header>

      <section className="today">
        <div className="region-label">{todayLabel}</div>
        <div className="scroll">
          {PERIODS.map((p) => {
            const items = (data?.today ?? []).filter((e) => periodOf(e.time) === p);
            return (
              <div className="period" key={p}>
                {(() => {
                  const Icon = PERIOD_ICON[p];
                  return (
                    <div className="ph">
                      <Icon className="ph-icon" size={16} strokeWidth={2.25} aria-hidden />
                      <span>{p}</span>
                    </div>
                  );
                })()}
                {items.length === 0
                  ? <div className="empty">—</div>
                  : items.map((e) => (
                      <div className="appt" key={e.id}>
                        <span className="time">{e.time}</span>
                        <span className="title">{e.title}</span>
                        {e.location && <span className="meta">{e.location}</span>}
                      </div>
                    ))}
              </div>
            );
          })}
        </div>
      </section>

      <main className="columns">
        <div className="col left">
          <div className="region-label">{curLabel}</div>
          {byDay((data?.currentMonth ?? []).filter((e) => e.day > curD)).map((g) => renderDayCard(g, curY))}
        </div>
        <div className="col right">
          <div className="region-label">{nextLabel}</div>
          {byDay(data?.nextMonth ?? []).map((g) => renderDayCard(g, nextY))}
        </div>
      </main>

      <a className="open-btn" href="https://calendar.google.com/calendar/u/0/r/agenda/assis.capim@gmail.com">🗓️ Abrir no Google Agenda</a>

      {err && <div className="error">Não foi possível carregar a agenda. ({esc(err)})</div>}
    </>
  );
}
