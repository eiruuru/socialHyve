import { StatusBadge, STATUS_LABELS } from '@/components/brand/StatusBadge';
import { getEffectivePublishStatus, isApprovedNotQueued } from '@/lib/publishStatus';

export function isApprovedDraft(post) {
  return isApprovedNotQueued(post);
}

export function getPostDisplayBadges(post) {
  if (!post) return [];

  const publishStatus = getEffectivePublishStatus(post);
  const badges = [];

  if (publishStatus === 'published') {
    badges.push({ key: 'publish', variant: 'published', label: STATUS_LABELS.published });
  } else if (publishStatus === 'publishing') {
    badges.push({ key: 'publish', variant: 'publishing', label: STATUS_LABELS.publishing });
  } else if (publishStatus === 'failed') {
    badges.push({ key: 'publish', variant: 'failed', label: STATUS_LABELS.failed });
  } else if (publishStatus === 'scheduled') {
    badges.push({ key: 'publish', variant: 'scheduled', label: STATUS_LABELS.scheduled });
  } else {
    badges.push({ key: 'publish', variant: 'draft', label: STATUS_LABELS.pending_publish });
  }

  const approval = post.approval_status || 'draft';
  if (approval === 'pending') {
    badges.push({ key: 'approval', variant: 'pending', label: STATUS_LABELS.pending });
  } else if (approval === 'changes_requested') {
    badges.push({ key: 'approval', variant: 'changes_requested', label: STATUS_LABELS.changes_requested });
  }

  return badges;
}

export function PostStatusBadges({ post, className }) {
  const badges = getPostDisplayBadges(post);
  return (
    <span className={className}>
      {badges.map((b) => (
        <StatusBadge key={b.key} variant={b.variant} label={b.label} className="mr-1" />
      ))}
    </span>
  );
}

const ALLOWED_TRANSITIONS = {
  draft: ['pending'],
  pending: ['approved', 'changes_requested'],
  changes_requested: ['pending'],
  approved: ['pending'],
};

export function canTransitionApproval(from, to) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function filterQueuePosts(posts, tab) {
  switch (tab) {
    case 'review':
      return posts.filter(
        (p) =>
          ['pending', 'changes_requested'].includes(p.approval_status) &&
          !['published', 'publishing'].includes(p.status)
      );
    case 'approved':
      return posts.filter(
        (p) => p.approval_status === 'approved' && ['draft', 'scheduled'].includes(p.status)
      );
    case 'active':
      return posts.filter((p) => p.status !== 'published');
    default:
      return posts;
  }
}
