import type { CalendarGateway } from '@/application/gateways/calendar-gateway';
import { GoogleCalendarGateway } from '@/infrastructure/google/google-calendar-gateway';

export interface Container {
  gateway: CalendarGateway;
}

/**
 * Composition root. The only place that knows about concrete providers and
 * environment configuration. Throws if required env is missing.
 */
export function buildContainer(): Container {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!apiKey || !calendarId) {
    throw new Error('missing_env: GOOGLE_CALENDAR_API_KEY / GOOGLE_CALENDAR_ID');
  }
  return {
    gateway: new GoogleCalendarGateway(apiKey, calendarId),
  };
}
