export const TOKEN_REFRESH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const TOKEN_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const MIN_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;

function unixSecondsToMs(value: number | null | undefined): number | null {
  if (value == null || value === 0) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds * 1000;
}

function isWithinRefreshWindow(expiresAtSeconds: number | null | undefined, now: number): boolean {
  const expiresMs = unixSecondsToMs(expiresAtSeconds);
  if (expiresMs == null) return false;
  return expiresMs - now <= TOKEN_REFRESH_WINDOW_MS;
}

export function soonestExpiryIso(
  expiresAt: number | null | undefined,
  dataAccessExpiresAt: number | null | undefined,
): string | null {
  const times = [unixSecondsToMs(expiresAt), unixSecondsToMs(dataAccessExpiresAt)]
    .filter((value): value is number => value != null);
  if (!times.length) return null;
  return new Date(Math.min(...times)).toISOString();
}

export function expiryIsoFromExpiresIn(expiresIn: number | null | undefined, now = Date.now()): string | null {
  const seconds = Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(now + seconds * 1000).toISOString();
}

export type UserTokenAction = {
  action: 'reconnect' | 'exchange' | 'keep';
  reason: string;
};

/**
 * Decide what the daily job should do with a Facebook user token.
 * Dead tokens are not exchanged. A still-valid token is exchanged when it
 * expires within 14 days or has not been refreshed in 7 days, and only after
 * it is at least a day old.
 */
export function decideUserTokenAction({
  isValid = null,
  expiresAt = null,
  dataAccessExpiresAt = null,
  issuedAt = null,
  refreshedAt = null,
  now = Date.now(),
}: {
  isValid?: boolean | null;
  expiresAt?: number | null;
  dataAccessExpiresAt?: number | null;
  issuedAt?: number | null;
  refreshedAt?: string | null;
  now?: number;
} = {}): UserTokenAction {
  if (isValid === false) {
    return { action: 'reconnect', reason: 'invalid' };
  }

  const issuedMs = unixSecondsToMs(issuedAt);
  if (issuedMs != null && now - issuedMs < MIN_TOKEN_AGE_MS) {
    return { action: 'keep', reason: 'too_young' };
  }

  if (isWithinRefreshWindow(expiresAt, now) || isWithinRefreshWindow(dataAccessExpiresAt, now)) {
    return { action: 'exchange', reason: 'expires_soon' };
  }

  const refreshedMs = refreshedAt ? new Date(refreshedAt).getTime() : null;
  const stale = refreshedMs == null || Number.isNaN(refreshedMs) || now - refreshedMs >= TOKEN_REFRESH_INTERVAL_MS;
  if (stale) return { action: 'exchange', reason: 'stale' };
  return { action: 'keep', reason: 'fresh' };
}
