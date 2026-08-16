const TERMINAL_PUBLISH_STATES = new Set(['published', 'publishing', 'failed']);

/** Publish state follows the stored status; only explicit Schedule sets scheduled. */
export function resolvePublishStatus({ status = 'draft', scheduled_at: scheduledAt }) {
  if (TERMINAL_PUBLISH_STATES.has(status)) return status;
  if (status === 'scheduled') return scheduledAt ? 'scheduled' : 'draft';
  return status || 'draft';
}

export function getEffectivePublishStatus(post) {
  if (!post) return 'draft';
  return resolvePublishStatus({
    status: post.status,
    scheduled_at: post.scheduled_at,
  });
}

/** Approved but publish state is still draft — not queued to go live yet. */
export function isApprovedNotQueued(post) {
  return post?.approval_status === 'approved' && getEffectivePublishStatus(post) === 'draft';
}

/** Approved and publish state is scheduled — queued to go live. */
export function isQueuedToPublish(post) {
  return post?.approval_status === 'approved' && getEffectivePublishStatus(post) === 'scheduled';
}
