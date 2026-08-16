import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { Button } from '@/components/ui/button';
import { showToast } from '@/lib/toast';
import { getPostDisplayBadges, isApprovedDraft } from './postStatus';
import { getScheduleUrgency } from './scheduleUrgency';
import { isQueuedToPublish } from '@/lib/publishStatus';
import { normalizeMediaList, isVideo } from '@/features/posts/previews/mediaUtils';
import { formatScheduledLabel, resolveScheduleTimezone } from '@/lib/scheduleTime';
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

function UrgencyBadge({ scheduleUrgency, className }) {
  if (!scheduleUrgency) return null;

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight shadow-sm',
        scheduleUrgency.badgeClass,
        className,
      )}
      title={scheduleUrgency.urgencyLabel}
    >
      {scheduleUrgency.shortLabel}
    </div>
  );
}

function ScheduleSection({ post, scheduleTimezone }) {
  if (!post.scheduled_at) return null;

  return (
    <div className="mt-3 border-t border-neutral-200 pt-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-ink">Scheduled · </span>
        {formatScheduledLabel(post.scheduled_at, scheduleTimezone)}
      </p>
    </div>
  );
}

function NeedsScheduleSection({ hasPlannedDate }) {
  return (
    <div className="mt-3 border-t border-honey-dark/20 pt-3">
      <p className="text-xs font-medium leading-relaxed text-honey-dark">
        {hasPlannedDate
          ? 'Planned on the calendar — open Edit and click Schedule to queue for publishing.'
          : 'Not queued to publish — open Edit to pick a date and click Schedule.'}
      </p>
    </div>
  );
}

export function PostQueueCard({
  post,
  onApprove,
  onRequestChanges,
  onPublish,
  showActions = true,
  allowManageActions = true,
  allowScheduleActions = false,
  navSearch = '',
  selectable = false,
  selected = false,
  onSelectChange,
}) {
  const navigate = useNavigate();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const badges = getPostDisplayBadges(post);
  const approval = post.approval_status || 'draft';
  const needsSchedule = isApprovedDraft(post);
  const scheduleUrgency = getScheduleUrgency(post.scheduled_at);
  const showUrgencyBadge = scheduleUrgency && !isQueuedToPublish(post);
  const scheduleTimezone = resolveScheduleTimezone({ postTimezone: post.schedule_timezone });
  const cardBorderClass = needsSchedule
    ? 'border-2 border-dashed border-honey-dark/40'
    : scheduleUrgency?.borderClass ?? 'border-2 border-neutral-200';

  const handleReject = () => {
    if (!rejectNote.trim()) {
      showToast({ title: 'Add feedback', description: 'Explain what needs to change.', variant: 'error' });
      return;
    }
    onRequestChanges?.(post.id, rejectNote.trim());
    setRejectOpen(false);
    setRejectNote('');
  };

  const actionButtons = showActions && (
    <div className="mt-4 flex w-full shrink-0 items-center gap-2 border-t border-neutral-200 pt-3">
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
      {approval === 'approved' && post.status === 'draft' && allowManageActions && (
        <Button size="sm" onClick={() => onPublish?.(post.id)}>Publish now</Button>
      )}
      {(allowManageActions || allowScheduleActions) && (
        <Button size="sm" variant="outline" onClick={() => navigate(`/app/posts/${post.id}/edit${navSearch}`)}>
          Edit
        </Button>
      )}
    </div>
  );

  const rejectForm = rejectOpen && (
    <div className="mt-3 space-y-2">
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

  return (
    <div className={cn(
      'relative flex h-full flex-col overflow-hidden rounded-hyve-md border bg-white shadow-sm',
      cardBorderClass,
      selected && 'ring-2 ring-honey',
    )}>
      {selectable && (
        <label className="absolute left-2 top-2 z-20 flex rounded-full bg-white/90 p-1 shadow-sm">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelectChange}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4"
            aria-label="Select post"
          />
        </label>
      )}
      <UrgencyBadge scheduleUrgency={showUrgencyBadge ? scheduleUrgency : null} className="right-2 top-2" />
      <button
        type="button"
        onClick={() => navigate(`/app/posts/${post.id}${navSearch}`)}
        className="relative aspect-square w-full overflow-hidden bg-neutral-100"
      >
        <PostThumb post={post} className="rounded-none" />
      </button>
      <div className="relative flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {post.publish_instagram && <PlatformChip platform="instagram" />}
          {post.publish_facebook && <PlatformChip platform="facebook" />}
          {badges.map((b) => (
            <StatusBadge key={b.key ?? b.variant} variant={b.variant} label={b.label} />
          ))}
        </div>
        <p className="line-clamp-3 text-sm leading-relaxed text-ink">
          {post.caption || post.internal_name || 'Untitled post'}
        </p>
        <ScheduleSection post={post} scheduleTimezone={scheduleTimezone} />
        {needsSchedule && <NeedsScheduleSection hasPlannedDate={!!post.scheduled_at} />}
        {rejectForm}
        {actionButtons}
      </div>
    </div>
  );
}
