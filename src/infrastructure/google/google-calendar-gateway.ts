import type { CalendarEvent } from '@/domain/calendar/event';
import { TIMEZONE } from '@/domain/calendar/event';
import type { CalendarGateway, CalendarRange } from '@/application/gateways/calendar-gateway';

interface GoogleCalendarItem {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

/**
 * Google Calendar API v3 adapter. Holds the API key + calendar id (config),
 * isolates fetch and provider error translation. Calendar must be public.
 */
export class GoogleCalendarGateway implements CalendarGateway {
  constructor(
    private readonly apiKey: string,
    private readonly calendarId: string
  ) {}

  async list(range: CalendarRange): Promise<CalendarEvent[]> {
    const url =
      'https://www.googleapis.com/calendar/v3/calendars/' +
      encodeURIComponent(this.calendarId) +
      '/events?key=' + encodeURIComponent(this.apiKey) +
      '&timeMin=' + encodeURIComponent(range.timeMin) +
      '&timeMax=' + encodeURIComponent(range.timeMax) +
      '&singleEvents=true&orderBy=startTime' +
      '&timeZone=' + encodeURIComponent(TIMEZONE);

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new Error('calendar_network_error:' + String(err));
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error('calendar_api_failed:' + res.status + ' ' + detail.slice(0, 200));
    }
    const data = (await res.json()) as { items?: GoogleCalendarItem[] };
    return (data.items ?? []).map(mapItem);
  }
}

function mapItem(item: GoogleCalendarItem): CalendarEvent {
  return {
    id: item.id ?? crypto.randomUUID(),
    title: item.summary ?? '(sem título)',
    description: item.description ?? '',
    location: item.location ?? '',
    start: item.start?.dateTime ?? item.start?.date ?? '',
    end: item.end?.dateTime ?? item.end?.date ?? '',
    allDay: !item.start?.dateTime,
  };
}
