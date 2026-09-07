import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPublishJobRow,
  claimStatusesForSource,
  collectQueuePostIds,
  isRetryableAttempt,
  MAX_PUBLISH_ATTEMPTS,
  MANUAL_CLAIM_STATUSES,
  nextPublishRetryAt,
  QUEUE_CLAIM_STATUSES,
  shouldResetToScheduledOnRetry,
  shouldSkipPublishedPlatform,
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
