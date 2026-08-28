export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  /** ISO 8601. For all-day events, date-only form (YYYY-MM-DD). */
  start: string;
  end: string;
  allDay: boolean;
}

/**
 * Campaign calendar lives in Brazil. Every date/time decision in the app must
 * be made against this timezone — NOT the runtime's local zone (Vercel runs in
 * UTC, which would shift "today" and all displayed times by ~3h).
 */
export const TIMEZONE = 'America/Sao_Paulo';

const SP_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const SP_TIME = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Parse an event date into a Date. All-day events are date-only ("YYYY-MM-DD")
 * and are normalized to local midnight so they sort/compare predictably.
 */
export function toDate(iso: string): Date {
  if (!iso) return new Date(NaN);
  return new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
}

/** Local calendar day label, e.g. "27" / "ago" (runtime-local, legacy). */
export function dayOfMonth(iso: string): number {
  return toDate(iso).getDate();
}

export function monthIndex(iso: string): number {
  return toDate(iso).getMonth();
}

export function yearOf(iso: string): number {
  return toDate(iso).getFullYear();
}

/**
 * São Paulo calendar key for an event start ("YYYY-MM-DD").
 * All-day events carry a date-only string that already IS the calendar date in
 * the calendar's timezone, so it is returned verbatim. Timed events are
 * formatted from their absolute instant in America/Sao_Paulo.
 */
export function spDateKey(iso: string): string {
  if (!iso) return '';
  if (iso.length <= 10) return iso;
  return SP_DATE.format(new Date(iso));
}

export function spYear(iso: string): number {
  return Number(spDateKey(iso).slice(0, 4));
}

/** 0-indexed month, São Paulo. */
export function spMonth(iso: string): number {
  return Number(spDateKey(iso).slice(5, 7)) - 1;
}

export function spDay(iso: string): number {
  return Number(spDateKey(iso).slice(8, 10));
}

/** "today" key in São Paulo for a given instant. */
export function spNowKey(now: Date = new Date()): string {
  return SP_DATE.format(now);
}

/** São Paulo year/month(0-indexed)/day for a given instant. */
export function spNowParts(now: Date = new Date()): { y: number; m: number; d: number } {
  const [y, m, d] = spNowKey(now).split('-').map(Number);
  return { y, m: m - 1, d };
}

/**
 * Display time (HH:MM) in São Paulo. All-day events return "" (the caller
 * substitutes "Dia todo"). Returns "" for empty/invalid input.
 */
export function spTime(iso: string): string {
  if (!iso || iso.length <= 10) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return SP_TIME.format(d);
}
