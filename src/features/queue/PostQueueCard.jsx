import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { Button } from '@/components/ui/button';
import { getPostDisplayBadges } from './postStatus';
import { normalizeMediaList, isVideo } from '@/features/posts/previews/mediaUtils';
import { cn } from '@/lib/utils';

function PostThumb({ post, className }) {
  const media = normalizeMediaList(post.post_media || []);
  const first = media[0];
  const mediaClass = cn('h-full w-full object-cover', className ?? 'rounded-[10px]');

  if (first?.public_url) {
    if (isVideo(first.mime_type)) {
      return <video src={first.public_url} className={mediaClass} muted />;
    }
    return <img src={first.public_url} alt="" className={mediaClass} />;
  }

  const label = post.publish_instagram && !post.publish_facebook ? 'IG' : post.publish_facebook ? 'FB' : '—';
  return (
    <div className={cn(
      'flex h-full w-full items-center justify-center bg-gradient-to-br from-honey-light to-amber-bright font-display font-bold text-honey-dark',
      className ?? 'rounded-[10px]',
    )}>
      {label}
    </div>
  );
}

export function PostQueueCard({
  post,
  authorEmail,
  onApprove,
  onRequestChanges,
  onPublish,
  showActions = true,
  variant = 'list',
}) {
  const navigate = useNavigate();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const badges = getPostDisplayBadges(post);
  const approval = post.approval_status || 'draft';

  const handleReject = () => {
    if (!rejectNote.trim()) {
      alert('Please add a comment explaining the requested changes.');
      return;
    }
    onRequestChanges?.(post.id, rejectNote.trim());
    setRejectOpen(false);
    setRejectNote('');
  };

  const actionButtons = showActions && (
    <div className={cn(
      'flex shrink-0 items-center gap-2',
      variant === 'grid' && 'mt-auto w-full pt-2',
    )}>
      {approval === 'pending' && (
        <>
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-status-changes text-status-changes hover:bg-[#FCE4E3]"
            aria-label="Request changes"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onApprove?.(post.id)}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-status-approved text-status-approved hover:bg-[#DFF3E6]"
            aria-label="Approve"
          >
            <Check className="h-4 w-4" />
          </button>
        </>
      )}
      {approval === 'approved' && post.status === 'draft' && (
        <Button size="sm" onClick={() => onPublish?.(post.id)}>Publish now</Button>
      )}
      <Button size="sm" variant="outline" onClick={() => navigate(`/app/posts/${post.id}/edit`)}>
        Edit
      </Button>
    </div>
  );

  const rejectForm = rejectOpen && (
    <div className="mt-2 space-y-2">
      <textarea
        className="w-full rounded-hyve-sm border border-neutral-200 p-2 text-sm"
        rows={2}
        placeholder="What needs to change?"
        value={rejectNote}
        onChange={(e) => setRejectNote(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
        <Button size="sm" variant="destructive" onClick={handleReject}>Send feedback</Button>
      </div>
    </div>
  );

  const metaRow = (
    <>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        {post.publish_instagram && <PlatformChip platform="instagram" />}
        {post.publish_facebook && <PlatformChip platform="facebook" />}
        {badges.map((b) => (
          <StatusBadge key={b.variant} variant={b.variant} label={b.label} />
        ))}
      </div>
      {authorEmail && variant === 'list' && (
        <p className="text-xs text-neutral-500">Posted by {authorEmail}</p>
      )}
      <p className={cn('text-sm text-ink', variant === 'list' ? 'truncate' : 'line-clamp-2')}>
        {post.caption || post.internal_name || 'Untitled post'}
      </p>
    </>
  );

  if (variant === 'grid') {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-hyve-md border border-neutral-200 bg-white">
        <button
          type="button"
          onClick={() => navigate(`/app/posts/${post.id}`)}
          className="aspect-square w-full overflow-hidden bg-neutral-100"
        >
          <PostThumb post={post} className="rounded-none" />
        </button>
        <div className="flex flex-1 flex-col p-3">
          {metaRow}
          {rejectForm}
          {actionButtons}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[72px_1fr_auto] items-center gap-3.5 rounded-hyve-md border border-neutral-200 bg-white p-4">
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden">
        <PostThumb post={post} />
      </div>

      <div className="min-w-0">
        {metaRow}
        {rejectForm}
      </div>

      {actionButtons}
    </div>
  );
}
