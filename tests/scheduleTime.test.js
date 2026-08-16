import test from 'node:test';
import assert from 'node:assert/strict';
import {
  zonedLocalToUtc,
  utcToZonedLocalInput,
  resolveScheduleTimezone,
  isPastCalendarDay,
  isScheduleInPast,
} from '../src/lib/scheduleTime.js';

test('zonedLocalToUtc converts Manila local time to UTC', () => {
  const utc = zonedLocalToUtc('2026-08-15T14:30', 'Asia/Manila');
  assert.ok(utc);
  const date = new Date(utc);
  assert.equal(date.getUTCHours(), 6);
  assert.equal(date.getUTCMinutes(), 30);
});

test('utcToZonedLocalInput round-trips with zonedLocalToUtc', () => {
  const naive = '2026-08-15T09:00';
  const tz = 'America/New_York';
  const utc = zonedLocalToUtc(naive, tz);
  const back = utcToZonedLocalInput(utc, tz);
  assert.equal(back, naive);
});

test('resolveScheduleTimezone prefers post then client then browser', () => {
  assert.equal(
    resolveScheduleTimezone({ postTimezone: 'Asia/Tokyo', clientTimezone: 'UTC' }),
    'Asia/Tokyo',
  );
  assert.equal(resolveScheduleTimezone({ clientTimezone: 'Europe/London' }), 'Europe/London');
});

test('isPastCalendarDay detects days before today', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  assert.equal(isPastCalendarDay(yesterday), true);
  assert.equal(isPastCalendarDay(new Date()), false);
  assert.equal(isPastCalendarDay(tomorrow), false);
});

test('isScheduleInPast detects elapsed schedule times', () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  const future = new Date(Date.now() + 60 * 60_000).toISOString();

  assert.equal(isScheduleInPast(past), true);
  assert.equal(isScheduleInPast(future), false);
});
