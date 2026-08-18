import { formatTimezoneOptionLabel } from './timezoneOptions.js';

/** @deprecated Prefer TIMEZONE_CATALOG in timezoneOptions.js */
export const COMMON_TIMEZONES = [
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Manila', label: 'Philippines (PHT)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Seoul', label: 'Korea (KST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (NZST)' },
  { value: 'UTC', label: 'UTC' },
];

export function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatTimezoneLabel(timeZone) {
  if (!timeZone) return 'UTC';
  try {
    return formatTimezoneOptionLabel(timeZone, { includeOffset: false });
  } catch {
    return timeZone.replace(/_/g, ' ');
  }
}

function partsInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '0' : parts.hour),
    minute: Number(parts.minute),
  };
}

export function zonedLocalToUtc(naiveDatetime, timeZone) {
  if (!naiveDatetime || !timeZone) return null;
  const [datePart, timePart] = naiveDatetime.split('T');
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const targetMs = Date.UTC(year, month - 1, day, hour, minute);

  let utcMs = targetMs;
  for (let i = 0; i < 4; i++) {
    const zoned = partsInTimeZone(new Date(utcMs), timeZone);
    const zonedMs = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute);
    utcMs += targetMs - zonedMs;
  }

  return new Date(utcMs).toISOString();
}

export function utcToZonedLocalInput(iso, timeZone) {
  if (!iso || !timeZone) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const p = partsInTimeZone(date, timeZone);
  const pad = (n) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatScheduledLabel(iso, timeZone, locale) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const formatted = new Intl.DateTimeFormat(locale || undefined, {
    timeZone: timeZone || getBrowserTimezone(),
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  return `${formatted} (${formatTimezoneLabel(timeZone)})`;
}

export function resolveScheduleTimezone({
  postTimezone,
  clientTimezone,
  workspaceTimezone,
}) {
  return postTimezone || clientTimezone || workspaceTimezone || getBrowserTimezone();
}

/** Calendar day (local midnight) is strictly before today. */
export function isPastCalendarDay(day) {
  if (!day || Number.isNaN(day.getTime())) return false;
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return start(day).getTime() < start(new Date()).getTime();
}

/** Scheduled instant is already in the past (optional buffer for "schedule soon" rules). */
export function isScheduleInPast(iso, { bufferMs = 0 } = {}) {
  if (!iso) return false;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return false;
  return ms < Date.now() - bufferMs;
}

/** Minimum value for `<input type="datetime-local">` in a given timezone. */
export function minScheduleLocalInput(timeZone, bufferMinutes = 10) {
  const minUtc = new Date(Date.now() + bufferMinutes * 60 * 1000).toISOString();
  return utcToZonedLocalInput(minUtc, timeZone || getBrowserTimezone());
}

export function rescheduleUtcToDay(iso, timeZone, targetDay) {
  if (!targetDay || Number.isNaN(targetDay.getTime())) return null;

  const pad = (n) => String(n).padStart(2, '0');
  const targetDate = `${targetDay.getFullYear()}-${pad(targetDay.getMonth() + 1)}-${pad(targetDay.getDate())}`;

  let hour = 9;
  let minute = 0;

  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      const parts = partsInTimeZone(date, timeZone);
      hour = parts.hour;
      minute = parts.minute;
    }
  }

  return zonedLocalToUtc(`${targetDate}T${pad(hour)}:${pad(minute)}`, timeZone);
}
