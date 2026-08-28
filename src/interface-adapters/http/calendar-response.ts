import type { AgendaView } from '@/application/services/calendar-service';
import { spTime, spDateKey, spMonth, spDay, TIMEZONE } from '@/domain/calendar/event';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

interface BaseItem {
  id: string;
  title: string;
  location: string;
}

function fmtTime(e: BaseItem & { start: string; allDay: boolean }): string {
  return e.allDay ? 'Dia todo' : spTime(e.start);
}

/** Translate application AgendaView into the wire response (times in America/Sao_Paulo). */
export function toAgendaResponse(view: AgendaView): AgendaResponse {
  return {
    timezone: TIMEZONE,
    todayKey: view.today.length
      ? spDateKey(view.today[0].start)
      : view.currentMonth.length
        ? spDateKey(view.currentMonth[0].start)
        : '',
    today: view.today.map((e) => ({
      id: e.id,
      time: fmtTime(e),
      title: e.title,
      location: e.location,
    })),
    currentMonth: view.currentMonth.map((e) => ({
      id: e.id,
      day: spDay(e.start),
      mon: MONTHS[spMonth(e.start)],
      title: e.title,
      time: fmtTime(e),
      location: e.location,
    })),
    nextMonth: view.nextMonth.map((e) => ({
      id: e.id,
      day: spDay(e.start),
      mon: MONTHS[spMonth(e.start)],
      title: e.title,
      time: fmtTime(e),
      location: e.location,
    })),
  };
}

/** Shape returned by GET /api/calendar (transport contract). */
export interface AgendaResponse {
  timezone: string;
  /** today's calendar date (YYYY-MM-DD) in America/Sao_Paulo — single source of truth for the client. */
  todayKey: string;
  today: { id: string; time: string; title: string; location: string }[];
  currentMonth: { id: string; day: number; mon: string; title: string; time: string; location: string }[];
  nextMonth: { id: string; day: number; mon: string; title: string; time: string; location: string }[];
}
