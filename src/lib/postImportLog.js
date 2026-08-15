const STORAGE_KEY = 'socialhyve_import_logs';
const MAX_SESSIONS_PER_CLIENT = 20;

function readAll() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadImportLogs(clientId) {
  if (!clientId) return [];
  const all = readAll();
  return all[clientId] || [];
}

export function saveImportSession(clientId, session) {
  if (!clientId) return session;

  const all = readAll();
  const existing = all[clientId] || [];
  const next = [session, ...existing].slice(0, MAX_SESSIONS_PER_CLIENT);
  all[clientId] = next;
  writeAll(all);
  return session;
}

export function clearImportLogs(clientId) {
  if (!clientId) return;
  const all = readAll();
  delete all[clientId];
  writeAll(all);
}

export function formatImportLogTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function rowDisplayName(row) {
  return row.internal_name?.trim()
    || row.caption?.trim()?.slice(0, 48)
    || `Row ${row.rowIndex}`;
}
