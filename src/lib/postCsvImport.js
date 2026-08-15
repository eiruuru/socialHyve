import Papa from 'papaparse';
import { zonedLocalToUtc, COMMON_TIMEZONES } from '@/lib/scheduleTime';

export const POST_IMPORT_TEMPLATE_URL = '/templates/post-import-template.csv';
export const MAX_IMPORT_ROWS = 200;
export const LARGE_FILE_ROW_THRESHOLD = 50;

export const CSV_COLUMNS = [
  'caption',
  'internal_name',
  'label',
  'publish_facebook',
  'publish_instagram',
  'scheduled_at',
  'schedule_timezone',
];

const IG_CAPTION_LIMIT = 2200;
const FB_CAPTION_LIMIT = 63206;

const VALID_TIMEZONES = new Set(COMMON_TIMEZONES.map((tz) => tz.value));

function isRowEmpty(row) {
  return CSV_COLUMNS.every((col) => !String(row[col] ?? '').trim());
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

function normalizeScheduledAt(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { value: null, error: null };

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return {
      value: null,
      error: 'scheduled_at must be YYYY-MM-DD HH:MM (e.g. 2026-08-20 09:00)',
    };
  }

  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  if (
    date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)
  ) {
    return { value: null, error: 'scheduled_at is not a valid date/time' };
  }

  return { value: `${year}-${month}-${day}T${hour}:${minute}`, error: null };
}

function normalizeTimezone(value, clientTimezone) {
  const raw = String(value ?? '').trim();
  if (!raw) return { value: clientTimezone || 'UTC', error: null };

  if (!VALID_TIMEZONES.has(raw)) {
    return {
      value: null,
      error: `schedule_timezone "${raw}" is not supported. Use an IANA timezone like America/New_York`,
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
  const label = String(row.label ?? '').trim();

  const publishFacebook = parseBoolean(row.publish_facebook, 'publish_facebook');
  const publishInstagram = parseBoolean(row.publish_instagram, 'publish_instagram');
  if (publishFacebook.error) errors.push(publishFacebook.error);
  if (publishInstagram.error) errors.push(publishInstagram.error);

  const scheduledAt = normalizeScheduledAt(row.scheduled_at);
  if (scheduledAt.error) errors.push(scheduledAt.error);

  const scheduleTimezone = normalizeTimezone(row.schedule_timezone, clientTimezone);
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
      scheduledAtLocal: scheduledAt.value,
      scheduleTimezone: scheduleTimezone.value,
    });

  return {
    skip: false,
    rowIndex,
    row: {
      caption,
      internal_name: internalName,
      label,
      publish_facebook: publishFacebook.value ?? row.publish_facebook ?? '',
      publish_instagram: publishInstagram.value ?? row.publish_instagram ?? '',
      scheduled_at: row.scheduled_at ?? '',
      schedule_timezone: scheduleTimezone.value ?? row.schedule_timezone ?? '',
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
    label: label || null,
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
  const missing = CSV_COLUMNS.filter((col) => !headers.includes(col));
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

export function downloadPostImportTemplate() {
  const link = document.createElement('a');
  link.href = POST_IMPORT_TEMPLATE_URL;
  link.download = 'post-import-template.csv';
  link.click();
}

export function truncateCaption(caption, max = 48) {
  const text = String(caption || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}
