import type { CalendarEvent } from '@/domain/calendar/event';
import { toDate, spDateKey, spNowKey, spNowParts, spMonth, spYear } from '@/domain/calendar/event';
import type { CalendarGateway, CalendarRange } from '@/application/gateways/calendar-gateway';

export interface AgendaView {
  today: CalendarEvent[];
  currentMonth: CalendarEvent[];
  nextMonth: CalendarEvent[];
}

/**
 * Builds the kiosk agenda view: events for today, the rest of the current
 * month, and the next month. Uses the gateway only through its port.
 * All date math is done in America/Sao_Paulo (see event.ts).
 */
export class BuildAgendaService {
  constructor(private readonly gateway: CalendarGateway) {}

  async execute(now: Date = new Date()): Promise<AgendaView> {
    const { y, m } = spNowParts(now);

    // Window: 1st of the current SP month 00:00 .. last day of next SP month 23:59.
    // Built as UTC instants from SP month parts so it is identical on every host.
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const lastMonth = m + 2; // exclusive bound month after next
    const endYear = y + (lastMonth > 11 ? 1 : 0);
    const endMonth = lastMonth % 12;
    const end = new Date(Date.UTC(endYear, endMonth, 0, 23, 59, 59, 0));

    const range: CalendarRange = { timeMin: start.toISOString(), timeMax: end.toISOString() };
    const events = await this.gateway.list(range);

    const byStart = [...events].sort(
      (a, b) => toDate(a.start).getTime() - toDate(b.start).getTime()
    );

    const isToday = (e: CalendarEvent) => spDateKey(e.start) === spNowKey(now);

    const currentMonthNum = m;
    const currentYear = y;
    const nextMonthNum = (m + 1) % 12;
    const nextYear = m + 1 > 11 ? y + 1 : y;

    const inCurrentMonth = (e: CalendarEvent) =>
      spMonth(e.start) === currentMonthNum && spYear(e.start) === currentYear;
    const inNextMonth = (e: CalendarEvent) =>
      spMonth(e.start) === nextMonthNum && spYear(e.start) === nextYear;

    return {
      today: byStart.filter(isToday),
      currentMonth: byStart.filter((e) => inCurrentMonth(e) && !isToday(e)),
      nextMonth: byStart.filter(inNextMonth),
    };
  }
}
