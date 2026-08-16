import { formatScheduledLabel } from '@/lib/scheduleTime';

const HIDDEN_CLIENT_ACTIONS = new Set(['assignee', 'review_link']);
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/;

/** Visual tone for activity rows — success, review, fail, or neutral. */
export const ACTIVITY_TONE = {
  SUCCESS: 'success',
  REVIEW: 'review',
  FAIL: 'fail',
  NEUTRAL: 'neutral',
};

export const ACTIVITY_TONE_META = {
  [ACTIVITY_TONE.SUCCESS]: {
    dotClass: 'bg-emerald-500',
    label: 'Completed',
  },
  [ACTIVITY_TONE.REVIEW]: {
    dotClass: 'bg-amber-500',
    label: 'In review',
  },
  [ACTIVITY_TONE.FAIL]: {
    dotClass: 'bg-red-500',
    label: 'Needs action',
  },
  [ACTIVITY_TONE.NEUTRAL]: {
    dotClass: 'bg-neutral-300',
    label: 'Update',
  },
};

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

/**
 * Maps an activity entry to a tone for the status dot.
 *
 * - fail (red): blocked or regressed — changes requested, publish failed, unqueued
 * - review (amber): waiting on someone — submitted for review, comments, resubmissions
 * - success (green): forward progress — approved, scheduled, rescheduled, published
 * - neutral (gray): routine edits with no workflow signal — created, content updated
 */
export function getActivityTone(entry) {
  const action = entry.action || '';
  const detail = (entry.detail || '').toLowerCase();

  if (
    detail.includes('changes requested')
    || detail.includes('changes_requested')
    || detail.includes('publish state changed to failed')
    || detail.includes('status changed to failed')
  ) {
    return ACTIVITY_TONE.FAIL;
  }

  if (
    action === 'scheduled'
    || action === 'rescheduled'
    || (detail.includes('approved') && !detail.includes('changes'))
    || detail.includes('publish state changed to published')
    || detail.includes('status changed to published')
    || detail.includes('publish state changed to scheduled')
    || (action === 'review_link' && detail.includes('approve'))
  ) {
    return ACTIVITY_TONE.SUCCESS;
  }

  if (
    detail.includes('submitted for review')
    || detail.includes('resubmitted for review')
    || detail.includes('status changed to pending')
    || detail.includes('publish state changed to draft')
    || action === 'comment'
    || action === 'unscheduled'
    || (action === 'review_link' && !detail.includes('approve'))
  ) {
    return ACTIVITY_TONE.REVIEW;
  }

  return ACTIVITY_TONE.NEUTRAL;
}

export function filterClientActivity(entries) {
  return (entries || []).filter((entry) => {
    if (HIDDEN_CLIENT_ACTIONS.has(entry.action)) return false;
    if (entry.action === 'comment' && entry.detail === 'Added internal comment') return false;
    return true;
  });
}
