/** Continents ordered with common agency audiences first (NN/g: surface likely regions early). */
export const TIMEZONE_REGION_ORDER = [
  'Americas',
  'Asia & Pacific',
  'Europe',
  'Africa & Middle East',
  'UTC',
];

/**
 * Curated IANA zones with city/country labels and regional time-zone aliases for search.
 * Sorted at runtime by city within each region (NN/g: alphabetical by city).
 */
export const TIMEZONE_CATALOG = [
  // Americas
  { value: 'America/Anchorage', city: 'Anchorage', country: 'United States', region: 'Americas', aliases: ['Alaska Time', 'AKT'] },
  { value: 'America/Los_Angeles', city: 'Los Angeles', country: 'United States', region: 'Americas', aliases: ['Pacific Time', 'PT', 'PST', 'PDT'] },
  { value: 'America/Denver', city: 'Denver', country: 'United States', region: 'Americas', aliases: ['Mountain Time', 'MT', 'MST', 'MDT'] },
  { value: 'America/Chicago', city: 'Chicago', country: 'United States', region: 'Americas', aliases: ['Central Time', 'CT', 'CST', 'CDT'] },
  { value: 'America/New_York', city: 'New York', country: 'United States', region: 'Americas', aliases: ['Eastern Time', 'ET', 'EST', 'EDT'] },
  { value: 'America/Phoenix', city: 'Phoenix', country: 'United States', region: 'Americas', aliases: ['Arizona'] },
  { value: 'America/Toronto', city: 'Toronto', country: 'Canada', region: 'Americas', aliases: ['Eastern Time', 'ET'] },
  { value: 'America/Vancouver', city: 'Vancouver', country: 'Canada', region: 'Americas', aliases: ['Pacific Time', 'PT'] },
  { value: 'America/Mexico_City', city: 'Mexico City', country: 'Mexico', region: 'Americas' },
  { value: 'America/Bogota', city: 'Bogotá', country: 'Colombia', region: 'Americas' },
  { value: 'America/Lima', city: 'Lima', country: 'Peru', region: 'Americas' },
  { value: 'America/Santiago', city: 'Santiago', country: 'Chile', region: 'Americas' },
  { value: 'America/Sao_Paulo', city: 'São Paulo', country: 'Brazil', region: 'Americas', aliases: ['Brasília Time', 'BRT'] },
  { value: 'America/Buenos_Aires', city: 'Buenos Aires', country: 'Argentina', region: 'Americas' },
  { value: 'Pacific/Honolulu', city: 'Honolulu', country: 'United States', region: 'Americas', aliases: ['Hawaii', 'HST'] },

  // Asia & Pacific
  { value: 'Asia/Manila', city: 'Manila', country: 'Philippines', region: 'Asia & Pacific', aliases: ['Philippine Time', 'PHT'] },
  { value: 'Asia/Singapore', city: 'Singapore', country: 'Singapore', region: 'Asia & Pacific', aliases: ['SGT'] },
  { value: 'Asia/Bangkok', city: 'Bangkok', country: 'Thailand', region: 'Asia & Pacific', aliases: ['Indochina Time', 'ICT'] },
  { value: 'Asia/Jakarta', city: 'Jakarta', country: 'Indonesia', region: 'Asia & Pacific', aliases: ['Western Indonesia Time', 'WIB'] },
  { value: 'Asia/Kuala_Lumpur', city: 'Kuala Lumpur', country: 'Malaysia', region: 'Asia & Pacific' },
  { value: 'Asia/Ho_Chi_Minh', city: 'Ho Chi Minh City', country: 'Vietnam', region: 'Asia & Pacific' },
  { value: 'Asia/Hong_Kong', city: 'Hong Kong', country: 'Hong Kong', region: 'Asia & Pacific', aliases: ['HKT'] },
  { value: 'Asia/Shanghai', city: 'Shanghai', country: 'China', region: 'Asia & Pacific', aliases: ['China Standard Time', 'CST'] },
  { value: 'Asia/Taipei', city: 'Taipei', country: 'Taiwan', region: 'Asia & Pacific' },
  { value: 'Asia/Seoul', city: 'Seoul', country: 'South Korea', region: 'Asia & Pacific', aliases: ['Korea Standard Time', 'KST'] },
  { value: 'Asia/Tokyo', city: 'Tokyo', country: 'Japan', region: 'Asia & Pacific', aliases: ['Japan Standard Time', 'JST'] },
  { value: 'Asia/Kolkata', city: 'Kolkata', country: 'India', region: 'Asia & Pacific', aliases: ['India Standard Time', 'IST'] },
  { value: 'Asia/Dubai', city: 'Dubai', country: 'United Arab Emirates', region: 'Asia & Pacific', aliases: ['Gulf Standard Time', 'GST'] },
  { value: 'Asia/Karachi', city: 'Karachi', country: 'Pakistan', region: 'Asia & Pacific', aliases: ['PKT'] },
  { value: 'Asia/Dhaka', city: 'Dhaka', country: 'Bangladesh', region: 'Asia & Pacific' },
  { value: 'Australia/Perth', city: 'Perth', country: 'Australia', region: 'Asia & Pacific', aliases: ['AWST'] },
  { value: 'Australia/Adelaide', city: 'Adelaide', country: 'Australia', region: 'Asia & Pacific', aliases: ['ACST'] },
  { value: 'Australia/Sydney', city: 'Sydney', country: 'Australia', region: 'Asia & Pacific', aliases: ['AEST', 'AEDT'] },
  { value: 'Australia/Melbourne', city: 'Melbourne', country: 'Australia', region: 'Asia & Pacific', aliases: ['AEST', 'AEDT'] },
  { value: 'Australia/Brisbane', city: 'Brisbane', country: 'Australia', region: 'Asia & Pacific', aliases: ['AEST'] },
  { value: 'Pacific/Auckland', city: 'Auckland', country: 'New Zealand', region: 'Asia & Pacific', aliases: ['NZST', 'NZDT'] },

  // Europe
  { value: 'Europe/London', city: 'London', country: 'United Kingdom', region: 'Europe', aliases: ['GMT', 'BST', 'Greenwich Mean Time'] },
  { value: 'Europe/Dublin', city: 'Dublin', country: 'Ireland', region: 'Europe', aliases: ['GMT', 'IST'] },
  { value: 'Europe/Lisbon', city: 'Lisbon', country: 'Portugal', region: 'Europe', aliases: ['WET'] },
  { value: 'Europe/Paris', city: 'Paris', country: 'France', region: 'Europe', aliases: ['Central European Time', 'CET', 'CEST'] },
  { value: 'Europe/Berlin', city: 'Berlin', country: 'Germany', region: 'Europe', aliases: ['Central European Time', 'CET', 'CEST'] },
  { value: 'Europe/Amsterdam', city: 'Amsterdam', country: 'Netherlands', region: 'Europe', aliases: ['CET', 'CEST'] },
  { value: 'Europe/Brussels', city: 'Brussels', country: 'Belgium', region: 'Europe', aliases: ['CET', 'CEST'] },
  { value: 'Europe/Madrid', city: 'Madrid', country: 'Spain', region: 'Europe', aliases: ['CET', 'CEST'] },
  { value: 'Europe/Rome', city: 'Rome', country: 'Italy', region: 'Europe', aliases: ['CET', 'CEST'] },
  { value: 'Europe/Stockholm', city: 'Stockholm', country: 'Sweden', region: 'Europe', aliases: ['CET', 'CEST'] },
  { value: 'Europe/Warsaw', city: 'Warsaw', country: 'Poland', region: 'Europe', aliases: ['CET', 'CEST'] },
  { value: 'Europe/Athens', city: 'Athens', country: 'Greece', region: 'Europe', aliases: ['EET', 'EEST'] },
  { value: 'Europe/Helsinki', city: 'Helsinki', country: 'Finland', region: 'Europe', aliases: ['EET', 'EEST'] },
  { value: 'Europe/Istanbul', city: 'Istanbul', country: 'Turkey', region: 'Europe', aliases: ['TRT'] },

  // Africa & Middle East
  { value: 'Africa/Cairo', city: 'Cairo', country: 'Egypt', region: 'Africa & Middle East', aliases: ['EET'] },
  { value: 'Africa/Johannesburg', city: 'Johannesburg', country: 'South Africa', region: 'Africa & Middle East', aliases: ['SAST'] },
  { value: 'Africa/Lagos', city: 'Lagos', country: 'Nigeria', region: 'Africa & Middle East', aliases: ['WAT'] },
  { value: 'Africa/Nairobi', city: 'Nairobi', country: 'Kenya', region: 'Africa & Middle East', aliases: ['EAT'] },
  { value: 'Asia/Riyadh', city: 'Riyadh', country: 'Saudi Arabia', region: 'Africa & Middle East', aliases: ['Arabia Standard Time', 'AST'] },
  { value: 'Asia/Jerusalem', city: 'Jerusalem', country: 'Israel', region: 'Africa & Middle East', aliases: ['IST'] },

  // UTC
  { value: 'UTC', city: 'UTC', country: 'Coordinated Universal Time', region: 'UTC', aliases: ['GMT', 'Greenwich Mean Time'] },
];

const catalogByValue = new Map(TIMEZONE_CATALOG.map((entry) => [entry.value, entry]));

function inferRegionFromZone(value) {
  if (!value || value === 'UTC') return 'UTC';
  const [area] = value.split('/');
  if (['America', 'Pacific', 'Atlantic'].includes(area)) return 'Americas';
  if (area === 'Europe') return 'Europe';
  if (area === 'Africa') return 'Africa & Middle East';
  if (['Asia', 'Australia', 'Indian'].includes(area)) return 'Asia & Pacific';
  return 'Asia & Pacific';
}

function inferCityFromZone(value) {
  if (!value) return 'Unknown';
  if (value === 'UTC') return 'UTC';
  const segment = value.split('/').pop() || value;
  return segment.replace(/_/g, ' ');
}

export function formatGmtOffset(timeZone, date = new Date()) {
  if (!timeZone) return 'GMT';
  if (timeZone === 'UTC') return 'GMT';

  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    const offset = parts.find((part) => part.type === 'timeZoneName')?.value;
    if (offset) return offset.replace(/^UTC/i, 'GMT');
  } catch {
    // fall through
  }

  return 'GMT';
}

export function buildTimezoneEntry(value) {
  const known = catalogByValue.get(value);
  if (known) {
    return {
      ...known,
      offset: formatGmtOffset(value),
    };
  }

  return {
    value,
    city: inferCityFromZone(value),
    country: value.split('/')[0]?.replace(/_/g, ' ') || 'Other',
    region: inferRegionFromZone(value),
    aliases: [],
    offset: formatGmtOffset(value),
  };
}

export function formatTimezoneOptionLabel(value, { includeOffset = true } = {}) {
  const entry = buildTimezoneEntry(value);
  const location = entry.country && entry.city !== entry.country
    ? `${entry.city}, ${entry.country}`
    : entry.city;
  if (!includeOffset) return location;
  return `${location} · ${entry.offset}`;
}

export function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function buildTimezoneSelectOptions({
  browserTz,
  workspaceDefault,
  includeValue,
} = {}) {
  const values = new Set(TIMEZONE_CATALOG.map((entry) => entry.value));
  const detected = browserTz || getBrowserTimezone();
  values.add(detected);
  if (workspaceDefault) values.add(workspaceDefault);
  if (includeValue) values.add(includeValue);

  return [...values].map((value) => buildTimezoneEntry(value));
}

export function filterTimezoneOptions(options, query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return options;

  return options.filter((entry) => {
    const haystack = [
      entry.city,
      entry.country,
      entry.value,
      entry.region,
      entry.offset,
      ...(entry.aliases || []),
    ].join(' ').toLowerCase();
    return haystack.includes(trimmed);
  });
}

export function groupTimezoneOptions(options) {
  const grouped = new Map(TIMEZONE_REGION_ORDER.map((region) => [region, []]));

  options.forEach((entry) => {
    const region = grouped.has(entry.region) ? entry.region : 'Asia & Pacific';
    grouped.get(region).push(entry);
  });

  grouped.forEach((entries, region) => {
    entries.sort((a, b) => a.city.localeCompare(b.city, undefined, { sensitivity: 'base' }));
    grouped.set(region, entries);
  });

  return TIMEZONE_REGION_ORDER
    .map((region) => ({ region, entries: grouped.get(region) || [] }))
    .filter((group) => group.entries.length > 0);
}

export function resolveWorkspaceTimezone({ clientTimezone, workspaceTimezone, browserTimezone } = {}) {
  return clientTimezone || workspaceTimezone || browserTimezone || getBrowserTimezone();
}
