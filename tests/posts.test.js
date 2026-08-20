import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDuplicatePayload,
  buildDuplicateMediaRows,
  duplicateInternalName,
} from '../src/lib/postDuplicate.js';
import { validatePost } from '../src/features/posts/postValidation.js';
import { validateFineTune } from '../src/features/posts/platformOverrides.js';

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

  assert.equal(payload.internal_name, '(copy) Summer promo');
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

test('duplicateInternalName strips existing copy prefix and suffix', () => {
  assert.equal(duplicateInternalName('Summer promo'), '(copy) Summer promo');
  assert.equal(duplicateInternalName('(copy) Summer promo'), '(copy) Summer promo');
  assert.equal(duplicateInternalName('Summer promo (copy)'), '(copy) Summer promo');
  assert.equal(duplicateInternalName('(copy) (copy) Summer promo'), '(copy) Summer promo');
  assert.equal(duplicateInternalName(null), null);
});

test('buildDuplicatePayload dedupes already-copied internal names', () => {
  const payload = buildDuplicatePayload({
    internal_name: '(copy) Summer promo',
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
    status: 'draft',
    approval_status: 'draft',
  });

  assert.equal(payload.internal_name, '(copy) Summer promo');
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

test('validatePost allows Instagram draft without media when requireInstagramMedia is false', () => {
  const errors = validatePost({
    caption: 'Hello',
    media: [],
    publishInstagram: true,
    publishFacebook: false,
    requireInstagramMedia: false,
  });

  assert.deepEqual(errors, []);
});

test('validatePost requires Instagram media for publish when requireInstagramMedia is true', () => {
  const errors = validatePost({
    caption: 'Hello',
    media: [],
    publishInstagram: true,
    publishFacebook: false,
    requireInstagramMedia: true,
  });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Instagram requires at least one image or video/);
});

test('validateFineTune skips Instagram media check for drafts', () => {
  const { errors } = validateFineTune({
    caption: 'Hello',
    media: [],
    platformOverrides: {},
    publishFacebook: false,
    publishInstagram: true,
    scheduledAt: null,
    firstComment: '',
    requireInstagramMedia: false,
  });

  assert.equal(errors.some((e) => /Instagram requires at least one image or video/.test(e)), false);
});

test('validateFineTune requires Instagram media for schedule/publish', () => {
  const { errors } = validateFineTune({
    caption: 'Hello',
    media: [],
    platformOverrides: {},
    publishFacebook: false,
    publishInstagram: true,
    scheduledAt: null,
    firstComment: '',
    requireInstagramMedia: true,
  });

  assert.equal(errors.some((e) => /Instagram requires at least one image or video/.test(e)), true);
});

test('draft validation allows Instagram enabled with no media', () => {
  const postErrors = validatePost({
    caption: 'Hello',
    media: [],
    publishInstagram: true,
    publishFacebook: false,
    requireInstagramMedia: false,
  });
  const { errors: fineTuneErrors } = validateFineTune({
    caption: 'Hello',
    media: [],
    platformOverrides: {},
    publishFacebook: false,
    publishInstagram: true,
    scheduledAt: '2028-09-05T00:00:00.000Z',
    firstComment: '',
    requireInstagramMedia: false,
  });
  const draftValidationErrors = [...postErrors, ...fineTuneErrors];

  assert.equal(
    draftValidationErrors.some((e) => /Instagram requires at least one image or video/.test(e)),
    false,
  );
});
