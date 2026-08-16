import { formatScheduledLabel } from '@/lib/scheduleTime';

const HIDDEN_CLIENT_ACTIONS = new Set(['assignee', 'review_link']);
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/;

function formatScheduledActivityDetail(iso) {
  return formatScheduledLabel(iso) || iso;
}

export function formatActivityDetail(entry) {
  const text = entry.detail || entry.action || '';

  const scheduledMatch = text.match(/^Scheduled for (.+)$/);
  if (scheduledMatch && ISO_TIMESTAMP.test(scheduledMatch[1])) {
    return `Scheduled for ${formatScheduledActivityDetail(scheduledMatch[1])}`;
  }

  return text.replace(/_/g, ' ');
}

export function filterClientActivity(entries) {
  return (entries || []).filter((entry) => {
    if (HIDDEN_CLIENT_ACTIONS.has(entry.action)) return false;
    if (entry.action === 'comment' && entry.detail === 'Added internal comment') return false;
    return true;
  });
}
