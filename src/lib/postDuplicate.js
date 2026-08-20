/** Pure helpers for post duplication — exported for unit tests. */

export function duplicateInternalName(name) {
  if (!name) return null;
  const stripped = name
    .replace(/^(?:\(copy\)\s*)+/, '')
    .replace(/(?:\s*\(copy\))+$/, '')
    .trim();
  return stripped ? `(copy) ${stripped}` : '(copy)';
}

function resolveDuplicatePlatformFlags(source) {
  const publishFacebook = source.publish_facebook ?? false;
  const publishInstagram = source.publish_instagram ?? false;
  if (!publishFacebook && !publishInstagram) {
    return { publish_facebook: true, publish_instagram: true };
  }
  return { publish_facebook: publishFacebook, publish_instagram: publishInstagram };
}

export function buildDuplicatePayload(source) {
  const platformFlags = resolveDuplicatePlatformFlags(source);
  return {
    internal_name: source.internal_name ? duplicateInternalName(source.internal_name) : null,
    label: source.label,
    caption: source.caption,
    first_comment: source.first_comment,
    platform_overrides: source.platform_overrides,
    ...platformFlags,
    facebook_account_id: source.facebook_account_id,
    instagram_account_id: source.instagram_account_id,
    schedule_timezone: source.schedule_timezone,
    scheduled_at: source.scheduled_at ?? null,
    status: 'draft',
    approval_status: 'draft',
  };
}

export function buildDuplicateMediaRows(sourceMedia, postId) {
  return [...(sourceMedia || [])]
    .filter((item) => !item.archived_at)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((item) => ({
      post_id: postId,
      source: item.source || 'upload',
      canva_design_id: item.canva_design_id ?? null,
      storage_path: item.storage_path,
      preview_storage_path: item.preview_storage_path,
      original_storage_path: item.original_storage_path,
      original_mime_type: item.original_mime_type ?? null,
      public_url: item.public_url,
      mime_type: item.mime_type,
      sort_order: item.sort_order ?? 0,
    }));
}
