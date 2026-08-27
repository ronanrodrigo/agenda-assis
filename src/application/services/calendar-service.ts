import type { CalendarEvent } from '@/domain/calendar/event';
import { toDate, dayOfMonth, monthIndex, yearOf } from '@/domain/calendar/event';
import type { CalendarGateway, CalendarRange } from '@/application/gateways/calendar-gateway';

export interface AgendaView {
  today: CalendarEvent[];
  currentMonth: CalendarEvent[];
  nextMonth: CalendarEvent[];
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * Builds the kiosk agenda view: events for today, the rest of the current
 * month, and the next month. Uses the gateway only through its port.
 */
export class BuildAgendaService {
  constructor(private readonly gateway: CalendarGateway) {}

  async execute(now: Date = new Date()): Promise<AgendaView> {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endMonth = now.getMonth() + 2; // end of next month
    const endYear = now.getFullYear() + (endMonth > 11 ? 1 : 0);
    const end = new Date(endYear, endMonth % 12, 0, 23, 59, 59, 0);

    const range: CalendarRange = { timeMin: start.toISOString(), timeMax: end.toISOString() };
    const events = await this.gateway.list(range);

    const byStart = [...events].sort(
      (a, b) => toDate(a.start).getTime() - toDate(b.start).getTime()
    );

    const isToday = (e: CalendarEvent) => sameDay(toDate(e.start), now);

    const currentMonthNum = now.getMonth();
    const currentYear = now.getFullYear();
    const nextMonthNum = (now.getMonth() + 1) % 12;
    const nextYear = now.getFullYear() + (now.getMonth() + 1 > 11 ? 1 : 0);

    const inCurrentMonth = (e: CalendarEvent) =>
      monthIndex(e.start) === currentMonthNum && yearOf(e.start) === currentYear;
    const inNextMonth = (e: CalendarEvent) =>
      monthIndex(e.start) === nextMonthNum && yearOf(e.start) === nextYear;

    return {
      today: byStart.filter(isToday),
      currentMonth: byStart.filter((e) => inCurrentMonth(e) && !isToday(e)),
      nextMonth: byStart.filter(inNextMonth),
    };
  }
}
