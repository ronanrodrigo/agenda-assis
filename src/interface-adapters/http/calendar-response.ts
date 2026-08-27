import type { AgendaView } from '@/application/services/calendar-service';

/** Shape returned by GET /api/calendar (transport contract). */
export interface AgendaResponse {
  today: { id: string; time: string; title: string; location: string }[];
  currentMonth: { id: string; day: number; mon: string; title: string; time: string; location: string }[];
  nextMonth: { id: string; day: number; mon: string; title: string; time: string; location: string }[];
}

const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function fmtTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Translate application AgendaView into the wire response. */
export function toAgendaResponse(view: AgendaView): AgendaResponse {
  return {
    today: view.today.map((e) => ({
      id: e.id,
      time: e.allDay ? 'Dia todo' : fmtTime(e.start),
      title: e.title,
      location: e.location,
    })),
    currentMonth: view.currentMonth.map((e) => ({
      id: e.id,
      day: new Date(e.start.length <= 10 ? e.start + 'T00:00:00' : e.start).getDate(),
      mon: MONTHS[new Date(e.start.length <= 10 ? e.start + 'T00:00:00' : e.start).getMonth()],
      title: e.title,
      time: e.allDay ? 'Dia todo' : fmtTime(e.start),
      location: e.location,
    })),
    nextMonth: view.nextMonth.map((e) => ({
      id: e.id,
      day: new Date(e.start.length <= 10 ? e.start + 'T00:00:00' : e.start).getDate(),
      mon: MONTHS[new Date(e.start.length <= 10 ? e.start + 'T00:00:00' : e.start).getMonth()],
      title: e.title,
      time: e.allDay ? 'Dia todo' : fmtTime(e.start),
      location: e.location,
    })),
  };
}
