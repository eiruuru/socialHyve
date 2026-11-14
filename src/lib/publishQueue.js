export const MAX_PUBLISH_ATTEMPTS = 3;
export const QUEUE_CLAIM_STATUSES = ['scheduled', 'failed'];
export const MANUAL_CLAIM_STATUSES = ['scheduled', 'draft', 'failed'];

export function uniquePostIds(ids = []) {
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function collectQueuePostIds(jobs = []) {
  return uniquePostIds(jobs.map((job) => job?.post_id));
}

export function shouldSkipPublishedPlatform(target) {
  return Boolean(target && target.status === 'published' && target.external_post_id);
}

export function findPlatformTarget(targets = [], platform) {
  return targets.find((target) => target.platform === platform) || null;
}

export function buildPublishJobRow(postId, scheduledAt) {
  return {
    post_id: postId,
    attempts: 0,
    next_run_at: scheduledAt,
    last_error: null,
  };
}

export function nextPublishRetryAt(attempts, now = Date.now()) {
  return new Date(now + attempts * 5 * 60 * 1000).toISOString();
}

export function isRetryableAttempt(attempts, maxAttempts = MAX_PUBLISH_ATTEMPTS) {
  return attempts < maxAttempts;
}

export function shouldResetToScheduledOnRetry() {
  return false;
}

export function claimStatusesForSource(fromQueue) {
  return fromQueue ? QUEUE_CLAIM_STATUSES : MANUAL_CLAIM_STATUSES;
}

export const TOKEN_HOLD_MS = 7 * 24 * 60 * 60 * 1000;
export const TOKEN_HOLD_RETRY_MS = 60 * 60 * 1000;

const TOKEN_ERROR_PATTERNS = [
  /reconnect meta/i,
  /session has expired/i,
  /session has been invalidated/i,
  /error validating access token/i,
  /invalid oauth/i,
  /oauth exception/i,
  /\(#190\)/,
  /\bcode 190\b/i,
  /page token expired/i,
  /page token is missing/i,
  /invalid page token/i,
  /missing page credentials/i,
  /not authorized for this meta login/i,
  /could not get page access token/i,
];

export function isTokenConnectionError(message) {
  if (!message) return false;
  return TOKEN_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function isTokenHoldExpired(scheduledAt, now = Date.now()) {
  const start = scheduledAt ? new Date(scheduledAt).getTime() : now;
  const base = Number.isFinite(start) ? start : now;
  return now >= base + TOKEN_HOLD_MS;
}

export function decidePublishFailure({
  errors,
  attempts = 0,
  scheduledAt = null,
  lastError = null,
  now = Date.now(),
} = {}) {
  const message = Array.isArray(errors) ? errors.join('; ') : String(errors || '');
  if (isTokenConnectionError(message)) {
    if (isTokenHoldExpired(scheduledAt, now)) {
      return {
        action: 'give_up',
        attempts: (attempts || 0) + 1,
        nextRunAt: null,
        notify: true,
      };
    }
    return {
      action: 'hold',
      attempts: attempts || 0,
      nextRunAt: new Date(now + TOKEN_HOLD_RETRY_MS).toISOString(),
      notify: !isTokenConnectionError(lastError),
    };
  }

  const nextAttempts = (attempts || 0) + 1;
  if (isRetryableAttempt(nextAttempts)) {
    return {
      action: 'retry',
      attempts: nextAttempts,
      nextRunAt: nextPublishRetryAt(nextAttempts, now),
      notify: false,
    };
  }
  return {
    action: 'give_up',
    attempts: nextAttempts,
    nextRunAt: null,
    notify: true,
  };
}

export const SKIPPED_CONNECTION_MESSAGES = [
  'No Facebook account connected',
  'No Instagram account connected',
];

export function shouldRequeueMissedPost(post, now = Date.now()) {
  if (!post || post.status !== 'published') return false;
  const scheduledMs = post.scheduled_at ? new Date(post.scheduled_at).getTime() : NaN;
  if (!Number.isFinite(scheduledMs) || now - scheduledMs >= TOKEN_HOLD_MS) return false;
  return (post.post_targets || []).some((target) =>
    target.status === 'skipped'
    && !target.external_post_id
    && SKIPPED_CONNECTION_MESSAGES.includes(target.error_message || '')
  );
}
