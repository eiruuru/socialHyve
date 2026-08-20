/** Pure helpers for post duplication — exported for unit tests. */

export function buildDuplicatePayload(source) {
  return {
    internal_name: source.internal_name ? `(copy) ${source.internal_name}` : null,
    label: source.label,
    caption: source.caption,
    first_comment: source.first_comment,
    platform_overrides: source.platform_overrides,
    publish_facebook: source.publish_facebook,
    publish_instagram: source.publish_instagram,
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
