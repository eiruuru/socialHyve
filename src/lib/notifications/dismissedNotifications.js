const STORAGE_KEY = 'socialhyve-dismissed-notifications';

export function getDismissedNotificationKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function dismissNotificationKeys(keys) {
  if (!keys.length) return;
  const dismissed = getDismissedNotificationKeys();
  for (const key of keys) dismissed.add(key);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
}
