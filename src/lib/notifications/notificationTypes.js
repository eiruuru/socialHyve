export const DEFAULT_IN_APP_PREFS = {
  client_invite: true,
  org_invite: true,
  submitted_for_review: true,
  approved: true,
  changes_requested: true,
  publish_success: true,
  publish_failed: true,
  review_needed: true,
};

export const IN_APP_PREF_LABELS = {
  client_invite: 'Client invitations',
  org_invite: 'Team invitations',
  submitted_for_review: 'Submitted for review',
  approved: 'Post approved',
  changes_requested: 'Changes requested',
  publish_success: 'Published successfully',
  publish_failed: 'Publish failed',
  review_needed: 'Posts awaiting your review',
};

export function eventLabel(event) {
  return IN_APP_PREF_LABELS[event] || event.replace(/_/g, ' ');
}

export function formatRelativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}
