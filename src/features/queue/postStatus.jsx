import { StatusBadge, STATUS_LABELS } from '@/components/brand/StatusBadge';

export function getPostDisplayBadges(post) {
  if (!post) return [];

  if (post.status === 'published') {
    return [{ variant: 'published', label: STATUS_LABELS.published }];
  }
  if (post.status === 'publishing') {
    return [{ variant: 'publishing', label: STATUS_LABELS.publishing }];
  }
  if (post.status === 'failed') {
    return [{ variant: 'failed', label: STATUS_LABELS.failed }];
  }
  if (post.status === 'scheduled' || (post.approval_status === 'approved' && post.scheduled_at)) {
    return [{ variant: 'scheduled', label: STATUS_LABELS.scheduled }];
  }

  const approval = post.approval_status || 'draft';
  return [{ variant: approval, label: STATUS_LABELS[approval] || approval }];
}

export function PostStatusBadges({ post, className }) {
  const badges = getPostDisplayBadges(post);
  return (
    <span className={className}>
      {badges.map((b) => (
        <StatusBadge key={b.variant} variant={b.variant} label={b.label} className="mr-1" />
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
