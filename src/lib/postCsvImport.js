import Papa from 'papaparse';
import { zonedLocalToUtc, COMMON_TIMEZONES } from '@/lib/scheduleTime';

export const POST_IMPORT_TEMPLATE_URL = '/templates/post-import-template.csv';
export const POST_IMPORT_TIMEZONES_URL = '/templates/post-import-timezones.csv';
export const MAX_IMPORT_ROWS = 200;
export const LARGE_FILE_ROW_THRESHOLD = 50;

export const CSV_COLUMNS = [
  'internal_name',
  'caption',
  'label',
  'publish_facebook',
  'publish_instagram',
  'scheduled_date',
  'scheduled_time',
  'schedule_timezone',
];

const REQUIRED_COLUMNS = [
  'internal_name',
  'caption',
  'label',
  'publish_facebook',
  'publish_instagram',
];

const IG_CAPTION_LIMIT = 2200;
const FB_CAPTION_LIMIT = 63206;

const VALID_TIMEZONES = new Set(COMMON_TIMEZONES.map((tz) => tz.value));

function pad2(n) {
  return String(n).padStart(2, '0');
}

function isRowEmpty(row) {
  return CSV_COLUMNS.every((col) => !String(row[col] ?? '').trim())
    && !String(row.scheduled_at ?? '').trim();
}

function parseBoolean(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { value: true, error: null };
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', 'yes', '1', 'y'].includes(normalized)) {
    return { value: true, error: null };
  }
  if (['false', 'no', '0', 'n'].includes(normalized)) {
    return { value: false, error: null };
  }

  return {
    value: null,
    error: `${fieldName} must be true/false, yes/no, or 1/0`,
  };
}

function normalizeScheduledDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { value: null, error: null };

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return validateDateParts(year, month, day);
  }

  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    const [, month, day, yearRaw] = usMatch;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return validateDateParts(year, month, day);
  }

  return {
    value: null,
    error: 'scheduled_date must be YYYY-MM-DD (e.g. 2026-08-20). Excel may show M/D/YY — that is also accepted.',
  };
}

function validateDateParts(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return { value: null, error: 'scheduled_date is not a valid date' };
  }
  return { value: `${y}-${pad2(m)}-${pad2(d)}`, error: null };
}

function normalizeScheduledTime(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { value: null, error: null };

  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return {
      value: null,
      error: 'scheduled_time must be 24-hour HH:MM (e.g. 09:00 or 14:30)',
    };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    return { value: null, error: 'scheduled_time is not a valid 24-hour time' };
  }

  return { value: `${pad2(hour)}:${pad2(minute)}`, error: null };
}

function normalizeScheduledAtLegacy(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { value: null, error: null };

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})$/);
    if (usMatch) {
      const [, month, day, yearRaw, hour, minute] = usMatch;
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
      const date = validateDateParts(year, month, day);
      const time = normalizeScheduledTime(`${hour}:${minute}`);
      if (date.error) return date;
      if (time.error) return time;
      return { value: `${date.value}T${time.value}`, error: null };
    }

    return {
      value: null,
      error: 'scheduled_at must be YYYY-MM-DD HH:MM (legacy column — prefer scheduled_date + scheduled_time)',
    };
  }

  const [, year, month, day, hour, minute] = match;
  const date = validateDateParts(year, month, day);
  if (date.error) return date;
  return { value: `${date.value}T${hour}:${minute}`, error: null };
}

function normalizeSchedule(row) {
  const legacy = String(row.scheduled_at ?? '').trim();
  const hasLegacy = Boolean(legacy);
  const hasDate = Boolean(String(row.scheduled_date ?? '').trim());
  const hasTime = Boolean(String(row.scheduled_time ?? '').trim());

  if (hasLegacy && (hasDate || hasTime)) {
    return {
      scheduledAtLocal: null,
      scheduledDisplay: '',
      errors: ['Use either scheduled_date + scheduled_time, or the legacy scheduled_at column — not both'],
    };
  }

  if (hasLegacy) {
    const scheduledAt = normalizeScheduledAtLegacy(legacy);
    return {
      scheduledAtLocal: scheduledAt.value,
      scheduledDisplay: legacy,
      errors: scheduledAt.error ? [scheduledAt.error] : [],
    };
  }

  const date = normalizeScheduledDate(row.scheduled_date);
  const time = normalizeScheduledTime(row.scheduled_time);
  const errors = [];
  if (date.error) errors.push(date.error);
  if (time.error) errors.push(time.error);

  if ((date.value && !time.value) || (!date.value && time.value)) {
    errors.push('scheduled_date and scheduled_time must both be set, or both left empty');
  }

  const scheduledAtLocal = date.value && time.value ? `${date.value}T${time.value}` : null;
  const scheduledDisplay = scheduledAtLocal
    ? `${date.value} ${time.value}`
    : '';

  return { scheduledAtLocal, scheduledDisplay, errors };
}

function normalizeTimezone(value, clientTimezone, hasSchedule) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    if (hasSchedule) {
      return { value: clientTimezone || 'UTC', error: null };
    }
    return { value: null, error: null };
  }

  if (!VALID_TIMEZONES.has(raw)) {
    return {
      value: null,
      error: `schedule_timezone "${raw}" is not supported. Download the timezone reference and use an IANA value like America/New_York`,
    };
  }

  return { value: raw, error: null };
}

export function validateRow(row, rowIndex, clientTimezone) {
  const errors = [];
  const warnings = [];

  if (isRowEmpty(row)) {
    return { skip: true, errors, warnings, payload: null };
  }

  const caption = String(row.caption ?? '').trim();
  const internalName = String(row.internal_name ?? '').trim();
  const label = String(row.label ?? '').trim() || 'Campaign';

  const publishFacebook = parseBoolean(row.publish_facebook, 'publish_facebook');
  const publishInstagram = parseBoolean(row.publish_instagram, 'publish_instagram');
  if (publishFacebook.error) errors.push(publishFacebook.error);
  if (publishInstagram.error) errors.push(publishInstagram.error);

  const schedule = normalizeSchedule(row);
  errors.push(...schedule.errors);

  const scheduleTimezone = normalizeTimezone(
    row.schedule_timezone,
    clientTimezone,
    Boolean(schedule.scheduledAtLocal),
  );
  if (scheduleTimezone.error) errors.push(scheduleTimezone.error);

  if (publishInstagram.value !== false && caption.length > IG_CAPTION_LIMIT) {
    warnings.push(`Caption exceeds Instagram limit (${IG_CAPTION_LIMIT} chars)`);
  }
  if (publishFacebook.value !== false && caption.length > FB_CAPTION_LIMIT) {
    warnings.push(`Caption exceeds Facebook limit (${FB_CAPTION_LIMIT} chars)`);
  }
  if (publishInstagram.value !== false && !caption) {
    warnings.push('Instagram posts typically need a caption');
  }

  const payload = errors.length
    ? null
    : rowToPostPayload({
      caption,
      internalName,
      label,
      publishFacebook: publishFacebook.value ?? true,
      publishInstagram: publishInstagram.value ?? true,
      scheduledAtLocal: schedule.scheduledAtLocal,
      scheduleTimezone: scheduleTimezone.value,
    });

  return {
    skip: false,
    rowIndex,
    row: {
      internal_name: internalName,
      caption,
      label,
      publish_facebook: publishFacebook.value ?? row.publish_facebook ?? '',
      publish_instagram: publishInstagram.value ?? row.publish_instagram ?? '',
      scheduled_date: row.scheduled_date ?? '',
      scheduled_time: row.scheduled_time ?? '',
      schedule_timezone: scheduleTimezone.value ?? row.schedule_timezone ?? '',
      schedule_display: schedule.scheduledDisplay,
    },
    errors,
    warnings,
    payload,
  };
}

export function rowToPostPayload({
  caption,
  internalName,
  label,
  publishFacebook,
  publishInstagram,
  scheduledAtLocal,
  scheduleTimezone,
}) {
  let scheduledAtUtc = null;
  if (scheduledAtLocal && scheduleTimezone) {
    scheduledAtUtc = zonedLocalToUtc(scheduledAtLocal, scheduleTimezone);
  }

  return {
    caption: caption || '',
    internal_name: internalName || null,
    label: label || 'Campaign',
    publish_facebook: publishFacebook,
    publish_instagram: publishInstagram,
    schedule_timezone: scheduledAtUtc ? scheduleTimezone : null,
    scheduled_at: scheduledAtUtc,
    status: 'draft',
    approval_status: 'draft',
  };
}

export function validateRows(rawRows, clientTimezone) {
  const rows = [];
  let validCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  const capped = rawRows.slice(0, MAX_IMPORT_ROWS);
  const truncated = rawRows.length > MAX_IMPORT_ROWS;

  capped.forEach((rawRow, index) => {
    const rowIndex = index + 2;
    const normalized = {};
    CSV_COLUMNS.forEach((col) => {
      normalized[col] = rawRow[col] ?? '';
    });
    normalized.scheduled_at = rawRow.scheduled_at ?? '';

    const result = validateRow(normalized, rowIndex, clientTimezone);
    if (result.skip) {
      skippedCount += 1;
      return;
    }

    rows.push(result);
    if (result.errors.length) {
      errorCount += 1;
    } else {
      validCount += 1;
    }
  });

  return { rows, validCount, errorCount, skippedCount, truncated };
}

function isTimezoneReferenceFile(headers) {
  return headers.includes('timezone') && !headers.includes('caption');
}

export function parsePostCsvText(text, clientTimezone) {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: false,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parsed.errors.length) {
    const first = parsed.errors[0];
    throw new Error(first.message || 'Could not parse CSV file');
  }

  const headers = parsed.meta.fields || [];

  if (isTimezoneReferenceFile(headers)) {
    throw new Error(
      'This looks like the timezone reference file. Upload the post import template instead, and keep the timezone reference as a separate download.',
    );
  }

  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(', ')}. Download the template and try again.`);
  }

  if (!parsed.data.length) {
    throw new Error('CSV file has no data rows. Add at least one post row below the header.');
  }

  return validateRows(parsed.data, clientTimezone);
}

export function parsePostCsvFile(file, clientTimezone) {
  return new Promise((resolve, reject) => {
    const reader = new window.FileReader();
    reader.onload = () => {
      try {
        resolve(parsePostCsvText(String(reader.result || ''), clientTimezone));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Could not read the CSV file'));
    reader.readAsText(file);
  });
}

export function truncateCaption(caption, max = 48) {
  const text = String(caption || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function truncateLabel(value, max = 48) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}
