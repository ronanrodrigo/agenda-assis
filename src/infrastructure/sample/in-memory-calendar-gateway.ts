import type { CalendarEvent } from '@/domain/calendar/event';
import type { CalendarGateway, CalendarRange } from '@/application/gateways/calendar-gateway';

/**
 * Deterministic in-memory adapter for tests and local development.
 * No network, no SDK, no framework, no external I/O.
 */
export class InMemoryCalendarGateway implements CalendarGateway {
  constructor(private readonly events: CalendarEvent[]) {}

  async list(range: CalendarRange): Promise<CalendarEvent[]> {
    const min = new Date(range.timeMin).getTime();
    const max = new Date(range.timeMax).getTime();
    return this.events.filter((e) => {
      const t = new Date(e.start).getTime();
      return t >= min && t <= max;
    });
  }
}
