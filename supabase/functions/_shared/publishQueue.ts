export const MAX_PUBLISH_ATTEMPTS = 3;
export const QUEUE_CLAIM_STATUSES = ['scheduled', 'failed'] as const;
export const MANUAL_CLAIM_STATUSES = ['scheduled', 'draft', 'failed'] as const;

export function uniquePostIds(ids: Array<string | null | undefined> = []): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function collectQueuePostIds(
  jobs: Array<{ post_id?: string | null } | null | undefined> = [],
): string[] {
  return uniquePostIds(jobs.map((job) => job?.post_id));
}

export function shouldSkipPublishedPlatform(
  target?: { status?: string | null; external_post_id?: string | null } | null,
): boolean {
  return Boolean(target && target.status === 'published' && target.external_post_id);
}

export function findPlatformTarget<T extends { platform?: string }>(
  targets: T[] | null | undefined,
  platform: string,
): T | null {
  return (targets || []).find((target) => target.platform === platform) || null;
}

export function nextPublishRetryAt(attempts: number, now = Date.now()): string {
  return new Date(now + attempts * 5 * 60 * 1000).toISOString();
}

export function isRetryableAttempt(attempts: number, maxAttempts = MAX_PUBLISH_ATTEMPTS): boolean {
  return attempts < maxAttempts;
}

export function shouldResetToScheduledOnRetry(): boolean {
  return false;
}

export function claimStatusesForSource(fromQueue: boolean): readonly string[] {
  return fromQueue ? QUEUE_CLAIM_STATUSES : MANUAL_CLAIM_STATUSES;
}
