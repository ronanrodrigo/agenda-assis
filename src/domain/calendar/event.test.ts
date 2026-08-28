import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  toDate,
  dayOfMonth,
  monthIndex,
  yearOf,
  spDateKey,
  spTime,
  spNowKey,
  spDay,
  spMonth,
  spYear,
} from './event';

test('toDate parses date-time with timezone offset', () => {
  const d = toDate('2026-08-27T16:00:00-03:00');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 7); // August is 7 (0-indexed)
  assert.equal(d.getDate(), 27);
  assert.equal(d.getHours(), 16);
});

test('toDate normalizes all-day date-only to local midnight', () => {
  const d = toDate('2026-08-27');
  assert.equal(d.getHours(), 0);
  assert.equal(d.getDate(), 27);
});

test('day/month/year helpers', () => {
  assert.equal(dayOfMonth('2026-09-01T08:00:00-03:00'), 1);
  assert.equal(monthIndex('2026-09-01T08:00:00-03:00'), 8); // September is 8
  assert.equal(yearOf('2026-09-01T08:00:00-03:00'), 2026);
});

test('toDate of empty string is invalid date', () => {
  assert.ok(Number.isNaN(toDate('').getTime()));
});

// --- Timezone: America/Sao_Paulo (the campaign calendar's timezone) ---

test('spDateKey of a timed event uses Sao Paulo civil date', () => {
  assert.equal(spDateKey('2026-08-27T16:00:00-03:00'), '2026-08-27');
});

test('spDateKey passes all-day date-only strings through verbatim', () => {
  assert.equal(spDateKey('2026-08-27'), '2026-08-27');
});

test('spTime renders the Sao Paulo clock time of a timed event', () => {
  assert.equal(spTime('2026-08-27T16:00:00-03:00'), '16:00');
  assert.equal(spTime('2026-08-27'), ''); // all-day has no time
});

test('spTime shifts an instant into Sao Paulo (UTC-3) correctly', () => {
  // 2026-08-27T23:30:00Z == 2026-08-27 20:30 in São Paulo.
  assert.equal(spTime('2026-08-27T23:30:00Z'), '20:30');
});

test('sp day/month/year helpers read the Sao Paulo civil date', () => {
  assert.equal(spDay('2026-08-27T16:00:00-03:00'), 27);
  assert.equal(spMonth('2026-08-27T16:00:00-03:00'), 7); // August
  assert.equal(spYear('2026-08-27T16:00:00-03:00'), 2026);
});

test('SP civil date differs from UTC date across midnight (regression)', () => {
  // Instant that is 2026-08-28 02:00 UTC == 2026-08-27 23:00 in São Paulo.
  const d = new Date('2026-08-28T02:00:00Z');
  assert.equal(d.getUTCDate(), 28); // UTC says the 28th
  assert.equal(spNowKey(d), '2026-08-27'); // São Paulo says the 27th
});
