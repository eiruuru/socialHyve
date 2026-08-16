import { formatScheduledLabel } from '@/lib/scheduleTime';

const HIDDEN_CLIENT_ACTIONS = new Set(['assignee', 'review_link']);
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/;

/** Visual tone for activity rows. */
export const ACTIVITY_TONE = {
  APPROVED: 'approved',
  SCHEDULED: 'scheduled',
  RESCHEDULED: 'rescheduled',
  REVIEW: 'review',
  FAIL: 'fail',
  NEUTRAL: 'neutral',
};

export const ACTIVITY_TONE_META = {
  [ACTIVITY_TONE.APPROVED]: {
    dotClass: 'bg-blue-500',
    label: 'Approved',
  },
  [ACTIVITY_TONE.SCHEDULED]: {
    dotClass: 'bg-emerald-500',
    label: 'Scheduled',
  },
  [ACTIVITY_TONE.RESCHEDULED]: {
    dotClass: 'bg-violet-500',
    label: 'Rescheduled',
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
 * - approved (blue): content approved
 * - scheduled (green): queued or published
 * - rescheduled (purple): date/time moved on the calendar
 * - fail (red): blocked or regressed
 * - review (amber): waiting on someone
 * - neutral (gray): routine edits
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

  if (action === 'rescheduled') {
    return ACTIVITY_TONE.RESCHEDULED;
  }

  if (
    action === 'scheduled'
    || detail.includes('publish state changed to scheduled')
    || detail.includes('publish state changed to published')
    || detail.includes('status changed to published')
  ) {
    return ACTIVITY_TONE.SCHEDULED;
  }

  if (
    (detail.includes('approved') && !detail.includes('changes'))
    || (action === 'review_link' && detail.includes('approve'))
  ) {
    return ACTIVITY_TONE.APPROVED;
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
