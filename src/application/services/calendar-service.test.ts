import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BuildAgendaService } from './calendar-service';
import type { CalendarEvent } from '@/domain/calendar/event';
import type { CalendarGateway, CalendarRange } from '@/application/gateways/calendar-gateway';

function ev(over: Partial<CalendarEvent> & { start: string; end: string }): CalendarEvent {
  return {
    id: over.id ?? over.start,
    title: over.title ?? 'Event',
    description: over.description ?? '',
    location: over.location ?? '',
    allDay: over.allDay ?? false,
    ...over,
  };
}

function fixedGateway(items: CalendarEvent[]): CalendarGateway {
  return {
    async list(range: CalendarRange): Promise<CalendarEvent[]> {
      // filter by range to mimic the real adapter
      const min = new Date(range.timeMin).getTime();
      const max = new Date(range.timeMax).getTime();
      return items.filter((e) => {
        const t = new Date(e.start).getTime();
        return t >= min && t <= max;
      });
    },
  };
}

test('partitions today / current month / next month', async () => {
  const now = new Date(2026, 7, 27, 12, 0, 0); // 27 Aug 2026, 12:00
  const items = [
    ev({ start: '2026-08-27T16:00:00-03:00', end: '2026-08-27T17:00:00-03:00', title: 'Hoje A' }),
    ev({ start: '2026-08-27T19:00:00-03:00', end: '2026-08-27T20:00:00-03:00', title: 'Hoje B' }),
    ev({ start: '2026-08-29T10:00:00-03:00', end: '2026-08-29T11:00:00-03:00', title: 'Mês A' }),
    ev({ start: '2026-09-01T08:00:00-03:00', end: '2026-09-01T09:00:00-03:00', title: 'Próximo A' }),
    ev({ start: '2026-09-05T16:00:00-03:00', end: '2026-09-05T17:00:00-03:00', title: 'Próximo B' }),
  ];
  const view = await new BuildAgendaService(fixedGateway(items)).execute(now);

  assert.equal(view.today.length, 2);
  assert.equal(view.today[0].title, 'Hoje A'); // sorted by start
  assert.equal(view.currentMonth.length, 1);
  assert.equal(view.currentMonth[0].title, 'Mês A');
  assert.equal(view.nextMonth.length, 2);
  assert.equal(view.nextMonth[0].title, 'Próximo A'); // sorted by start
});

test('today events are excluded from currentMonth bucket', async () => {
  const now = new Date(2026, 7, 27, 9, 0, 0);
  const items = [
    ev({ start: '2026-08-27T16:00:00-03:00', end: '2026-08-27T17:00:00-03:00' }),
  ];
  const view = await new BuildAgendaService(fixedGateway(items)).execute(now);
  assert.equal(view.today.length, 1);
  assert.equal(view.currentMonth.length, 0);
});

test('handles December -> January year rollover', async () => {
  const now = new Date(2026, 11, 31, 12, 0, 0); // 31 Dec 2026
  const items = [
    ev({ start: '2027-01-02T08:00:00-03:00', end: '2027-01-02T09:00:00-03:00' }),
  ];
  const view = await new BuildAgendaService(fixedGateway(items)).execute(now);
  assert.equal(view.nextMonth.length, 1);
  assert.equal(view.currentMonth.length, 0);
});
