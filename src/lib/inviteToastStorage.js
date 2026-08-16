const STORAGE_KEY = 'socialhyve_invite_toast_state';

/** How long we keep nudging the user with in-app invite toasts */
export const INVITE_TOAST_WINDOW_MS = 12 * 60 * 60 * 1000;

/** Hide toast temporarily when user taps Later */
export const INVITE_TOAST_SNOOZE_MS = 60 * 60 * 1000;

function readState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function shouldShowInviteToast(invite) {
  const createdAt = new Date(invite.created_at).getTime();
  if (Date.now() - createdAt > INVITE_TOAST_WINDOW_MS) return false;

  const state = readState();
  const entry = state[invite.id];
  if (entry?.snoozedUntil && Date.now() < entry.snoozedUntil) return false;

  const remindedAt = new Date(invite.reminded_at || invite.created_at).getTime();
  const lastSeen = entry?.lastRemindedAt ? new Date(entry.lastRemindedAt).getTime() : 0;
  return remindedAt > lastSeen;
}

export function markInviteToastShown(invite) {
  const state = readState();
  state[invite.id] = {
    ...state[invite.id],
    lastRemindedAt: invite.reminded_at || invite.created_at,
    snoozedUntil: null,
  };
  writeState(state);
}

export function snoozeInviteToast(inviteId) {
  const state = readState();
  state[inviteId] = {
    ...state[inviteId],
    snoozedUntil: Date.now() + INVITE_TOAST_SNOOZE_MS,
  };
  writeState(state);
}

export function clearInviteToastState(inviteId) {
  const state = readState();
  delete state[inviteId];
  writeState(state);
}

export function isWithinInviteToastWindow(invite) {
  const createdAt = new Date(invite.created_at).getTime();
  return Date.now() - createdAt <= INVITE_TOAST_WINDOW_MS;
}
