import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPublishJobRow,
  claimStatusesForSource,
  collectQueuePostIds,
  decidePublishFailure,
  isRetryableAttempt,
  MAX_PUBLISH_ATTEMPTS,
  MANUAL_CLAIM_STATUSES,
  nextPublishRetryAt,
  QUEUE_CLAIM_STATUSES,
  shouldRequeueMissedPost,
  shouldResetToScheduledOnRetry,
  shouldSkipPublishedPlatform,
  TOKEN_HOLD_RETRY_MS,
  uniquePostIds,
} from '../src/lib/publishQueue.js';
import { buildSavedMediaPath, isDraftStoragePath } from '../src/lib/postMedia.js';

test('uniquePostIds drops empties and duplicates while preserving order', () => {
  assert.deepEqual(
    uniquePostIds(['a', 'b', 'a', null, '', 'c', 'b']),
    ['a', 'b', 'c'],
  );
});

test('collectQueuePostIds uses publish_jobs only and dedupes post ids', () => {
  assert.deepEqual(
    collectQueuePostIds([
      { post_id: 'post-1' },
      { post_id: 'post-2' },
      { post_id: 'post-1' },
      { post_id: null },
    ]),
    ['post-1', 'post-2'],
  );
});

test('shouldSkipPublishedPlatform requires both published status and an external id', () => {
  assert.equal(shouldSkipPublishedPlatform(null), false);
  assert.equal(shouldSkipPublishedPlatform({ status: 'failed', external_post_id: 'x' }), false);
  assert.equal(shouldSkipPublishedPlatform({ status: 'published', external_post_id: null }), false);
  assert.equal(shouldSkipPublishedPlatform({ status: 'published', external_post_id: '123' }), true);
});

test('retryable failures stay failed and are driven by publish_jobs backoff', () => {
  assert.equal(shouldResetToScheduledOnRetry(), false);
  assert.equal(isRetryableAttempt(1), true);
  assert.equal(isRetryableAttempt(2), true);
  assert.equal(isRetryableAttempt(MAX_PUBLISH_ATTEMPTS), false);
  assert.equal(nextPublishRetryAt(1, Date.parse('2026-09-07T00:00:00.000Z')), '2026-09-07T00:05:00.000Z');
  assert.equal(nextPublishRetryAt(2, Date.parse('2026-09-07T00:00:00.000Z')), '2026-09-07T00:10:00.000Z');
});

test('queue claims scheduled or failed posts; manual publish also allows drafts', () => {
  assert.deepEqual(claimStatusesForSource(true), QUEUE_CLAIM_STATUSES);
  assert.deepEqual(claimStatusesForSource(false), MANUAL_CLAIM_STATUSES);
  assert.ok(!QUEUE_CLAIM_STATUSES.includes('draft'));
  assert.ok(MANUAL_CLAIM_STATUSES.includes('draft'));
});

test('token errors stay queued without using the normal attempt budget', () => {
  const now = Date.parse('2026-09-15T00:00:00.000Z');
  const scheduledAt = '2026-09-14T00:00:00.000Z';
  const first = decidePublishFailure({
    errors: ['Facebook: Facebook Page token expired. Reconnect Meta in Account → Meta Accounts.'],
    attempts: 0,
    scheduledAt,
    lastError: null,
    now,
  });
  assert.equal(first.action, 'hold');
  assert.equal(first.attempts, 0);
  assert.equal(first.notify, true);
  assert.equal(first.nextRunAt, new Date(now + TOKEN_HOLD_RETRY_MS).toISOString());

  const again = decidePublishFailure({
    errors: ['(#190) Error validating access token: Session has expired'],
    attempts: 0,
    scheduledAt,
    lastError: 'Facebook Page token expired. Reconnect Meta',
    now,
  });
  assert.equal(again.action, 'hold');
  assert.equal(again.attempts, 0);
  assert.equal(again.notify, false);
});

test('token holds end 7 days after the scheduled time', () => {
  const now = Date.parse('2026-09-15T00:00:00.000Z');
  const decision = decidePublishFailure({
    errors: ['Instagram: session has been invalidated'],
    attempts: 0,
    scheduledAt: '2026-09-08T00:00:00.000Z',
    now,
  });
  assert.equal(decision.action, 'give_up');
  assert.equal(decision.notify, true);
  assert.equal(decision.nextRunAt, null);
});

test('a normal Graph error still stops after 3 attempts', () => {
  const now = Date.parse('2026-09-07T00:00:00.000Z');
  const first = decidePublishFailure({
    errors: ['Facebook: Invalid image aspect ratio'],
    attempts: 0,
    scheduledAt: '2026-09-07T00:00:00.000Z',
    now,
  });
  assert.equal(first.action, 'retry');
  assert.equal(first.attempts, 1);
  assert.equal(first.notify, false);
  assert.equal(first.nextRunAt, nextPublishRetryAt(1, now));

  const third = decidePublishFailure({
    errors: ['Facebook: Invalid image aspect ratio'],
    attempts: 2,
    scheduledAt: '2026-09-07T00:00:00.000Z',
    now,
  });
  assert.equal(third.action, 'give_up');
  assert.equal(third.attempts, MAX_PUBLISH_ATTEMPTS);
  assert.equal(third.notify, true);
});

test('falsely published connection skips from the last 7 days are requeued', () => {
  const now = Date.parse('2026-09-15T00:00:00.000Z');
  assert.equal(shouldRequeueMissedPost({
    status: 'published',
    scheduled_at: '2026-09-14T00:00:00.000Z',
    post_targets: [{
      status: 'skipped',
      error_message: 'No Instagram account connected',
      external_post_id: null,
    }],
  }, now), true);

  assert.equal(shouldRequeueMissedPost({
    status: 'published',
    scheduled_at: '2026-09-14T00:00:00.000Z',
    post_targets: [{
      status: 'published',
      error_message: null,
      external_post_id: '123',
    }],
  }, now), false);

  assert.equal(shouldRequeueMissedPost({
    status: 'published',
    scheduled_at: '2026-09-01T00:00:00.000Z',
    post_targets: [{
      status: 'skipped',
      error_message: 'No Facebook account connected',
      external_post_id: null,
    }],
  }, now), false);
});

test('buildPublishJobRow resets attempts and stores the next run time', () => {
  assert.deepEqual(
    buildPublishJobRow('post-1', '2026-09-10T13:00:00.000Z'),
    {
      post_id: 'post-1',
      attempts: 0,
      next_run_at: '2026-09-10T13:00:00.000Z',
      last_error: null,
    },
  );
});

test('draft storage paths move into the post folder on save', () => {
  const draftPath = 'org-1/client-1/draft/DAHUgqmCfM4-p1.png';
  assert.equal(isDraftStoragePath(draftPath), true);
  assert.equal(
    buildSavedMediaPath(draftPath, 'post-99'),
    'org-1/client-1/post-99/DAHUgqmCfM4-p1.png',
  );
  assert.equal(
    buildSavedMediaPath('org-1/client-1/post-99/DAHUgqmCfM4-p1.png', 'post-99'),
    'org-1/client-1/post-99/DAHUgqmCfM4-p1.png',
  );
  assert.equal(isDraftStoragePath('org-1/client-1/post-99/file.png'), false);
});
