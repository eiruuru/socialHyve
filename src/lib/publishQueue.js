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
