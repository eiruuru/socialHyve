import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { Button } from '@/components/ui/button';
import { getPostDisplayBadges } from './postStatus';
import { normalizeMediaList, isVideo } from '@/features/posts/previews/mediaUtils';

function PostThumb({ post }) {
  const media = normalizeMediaList(post.post_media || []);
  const first = media[0];

  if (first?.public_url) {
    if (isVideo(first.mime_type)) {
      return <video src={first.public_url} className="h-full w-full rounded-[10px] object-cover" muted />;
    }
    return <img src={first.public_url} alt="" className="h-full w-full rounded-[10px] object-cover" />;
  }

  const label = post.publish_instagram && !post.publish_facebook ? 'IG' : post.publish_facebook ? 'FB' : '—';
  return (
    <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-gradient-to-br from-honey-light to-amber-bright font-display font-bold text-honey-dark">
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

  return (
    <div className="grid grid-cols-[72px_1fr_auto] items-center gap-3.5 rounded-hyve-md border border-neutral-200 bg-white p-4">
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden">
        <PostThumb post={post} />
      </div>

      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          {post.publish_instagram && <PlatformChip platform="instagram" />}
          {post.publish_facebook && <PlatformChip platform="facebook" />}
          {badges.map((b) => (
            <StatusBadge key={b.variant} variant={b.variant} label={b.label} />
          ))}
        </div>
        {authorEmail && (
          <p className="text-xs text-neutral-500">Posted by {authorEmail}</p>
        )}
        <p className="truncate text-sm text-ink">{post.caption || 'Untitled post'}</p>
        {rejectOpen && (
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
        )}
      </div>

      {showActions && (
        <div className="flex shrink-0 items-center gap-2">
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
      )}
    </div>
  );
}
