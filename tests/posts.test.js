import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDuplicatePayload,
  buildDuplicateMediaRows,
} from '../src/lib/postDuplicate.js';

test('buildDuplicatePayload preserves schedule and resets draft state', () => {
  const source = {
    internal_name: 'Summer promo',
    label: 'Promo',
    caption: 'Hello world',
    first_comment: 'Link in bio',
    platform_overrides: { instagram: { caption: 'IG only' } },
    publish_facebook: true,
    publish_instagram: true,
    facebook_account_id: 'fb-1',
    instagram_account_id: 'ig-1',
    schedule_timezone: 'Asia/Manila',
    scheduled_at: '2026-08-20T06:00:00.000Z',
    status: 'scheduled',
    approval_status: 'approved',
  };

  const payload = buildDuplicatePayload(source);

  assert.equal(payload.internal_name, 'Summer promo (copy)');
  assert.equal(payload.scheduled_at, source.scheduled_at);
  assert.equal(payload.schedule_timezone, 'Asia/Manila');
  assert.equal(payload.status, 'draft');
  assert.equal(payload.approval_status, 'draft');
  assert.equal(payload.caption, source.caption);
  assert.equal(payload.publish_facebook, true);
  assert.equal(payload.instagram_account_id, 'ig-1');
});

test('buildDuplicatePayload handles missing internal name and schedule', () => {
  const source = {
    label: null,
    caption: null,
    first_comment: null,
    platform_overrides: null,
    publish_facebook: false,
    publish_instagram: false,
    facebook_account_id: null,
    instagram_account_id: null,
    schedule_timezone: null,
    scheduled_at: null,
    status: 'published',
    approval_status: 'approved',
  };

  const payload = buildDuplicatePayload(source);

  assert.equal(payload.internal_name, null);
  assert.equal(payload.scheduled_at, null);
  assert.equal(payload.status, 'draft');
  assert.equal(payload.approval_status, 'draft');
});

test('buildDuplicateMediaRows skips archived media and preserves order', () => {
  const rows = buildDuplicateMediaRows(
    [
      { storage_path: 'b.jpg', mime_type: 'image/jpeg', sort_order: 1, archived_at: '2026-01-01' },
      { storage_path: 'a.jpg', mime_type: 'image/jpeg', sort_order: 0, source: 'canva', canva_design_id: 'd-1' },
      { storage_path: 'c.jpg', mime_type: 'image/jpeg', sort_order: 2 },
    ],
    'post-copy-id',
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].storage_path, 'a.jpg');
  assert.equal(rows[0].post_id, 'post-copy-id');
  assert.equal(rows[0].source, 'canva');
  assert.equal(rows[0].canva_design_id, 'd-1');
  assert.equal(rows[1].storage_path, 'c.jpg');
});
