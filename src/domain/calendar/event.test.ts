import { test } from 'vitest';
import assert from 'node:assert/strict';
import { toDate, dayOfMonth, monthIndex, yearOf } from './event';

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
