import type { CalendarEvent } from '@/domain/calendar/event';

export interface CalendarRange {
  /** ISO 8601 inclusive lower bound. */
  timeMin: string;
  /** ISO 8601 inclusive upper bound. */
  timeMax: string;
}

/**
 * Capability port: read calendar events for a time range.
 * Name is a capability, not a vendor/protocol.
 */
export interface CalendarGateway {
  list(range: CalendarRange): Promise<CalendarEvent[]>;
}
