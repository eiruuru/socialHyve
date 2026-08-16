import { invokeFunction } from '@/lib/supabaseFunctions';

const EVENT_TITLES = {
  submitted_for_review: 'Post submitted for review',
  approved: 'Post approved',
  changes_requested: 'Changes requested',
  publish_success: 'Post published',
  publish_failed: 'Publish failed',
};

export async function createInAppNotifications(notifications) {
  if (!notifications?.length) return null;
  try {
    return await invokeFunction('createNotifications', { notifications });
  } catch {
    return null;
  }
}

export function buildWorkflowNotifications({
  event,
  recipientUserIds,
  postId,
  postTitle,
  href,
}) {
  const title = EVENT_TITLES[event] || event.replace(/_/g, ' ');
  const unique = [...new Set(recipientUserIds.filter(Boolean))];
  return unique.map((userId) => ({
    userId,
    type: 'workflow',
    event,
    title,
    body: postTitle || null,
    href: href || `/app/posts/${postId}`,
    metadata: { postId },
  }));
}

export async function notifyWorkflowInApp({
  event,
  postId,
  recipientUserIds,
  postTitle,
  href,
}) {
  const notifications = buildWorkflowNotifications({
    event,
    recipientUserIds,
    postId,
    postTitle,
    href,
  });
  return createInAppNotifications(notifications);
}

export async function notifyPublishInApp({
  event,
  postId,
  recipientUserIds,
  postTitle,
  errorMessage,
}) {
  const title = EVENT_TITLES[event] || event;
  const unique = [...new Set(recipientUserIds.filter(Boolean))];
  const notifications = unique.map((userId) => ({
    userId,
    type: 'publish',
    event,
    title,
    body: event === 'publish_failed' ? (errorMessage || postTitle) : postTitle,
    href: `/app/posts/${postId}`,
    metadata: { postId },
  }));
  return createInAppNotifications(notifications);
}
