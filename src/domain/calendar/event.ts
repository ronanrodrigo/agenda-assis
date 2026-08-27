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
 * Parse an event date into a Date. All-day events are date-only ("YYYY-MM-DD")
 * and are normalized to local midnight so they sort/compare predictably.
 */
export function toDate(iso: string): Date {
  if (!iso) return new Date(NaN);
  return new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
}

/** Local calendar day label, e.g. "27" / "ago". */
export function dayOfMonth(iso: string): number {
  return toDate(iso).getDate();
}

export function monthIndex(iso: string): number {
  return toDate(iso).getMonth();
}

export function yearOf(iso: string): number {
  return toDate(iso).getFullYear();
}
