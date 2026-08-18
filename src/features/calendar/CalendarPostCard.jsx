import { useRef } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { getScheduleUrgency } from '@/features/queue/scheduleUrgency';
import { PostStatusIconRow } from '@/features/queue/postStatusIcons';
import { getPostCalendarDate } from '@/features/posts/postNavUtils';
import { shouldShowScheduleUrgency } from '@/lib/publishStatus';
import { isVideo } from '@/features/posts/previews/mediaUtils';
import { cn } from '@/lib/utils';

const NON_DRAGGABLE_STATUSES = new Set(['published', 'publishing']);

export function isPostDraggable(post) {
  return post && !NON_DRAGGABLE_STATUSES.has(post.status);
}

function MediaPlaceholder({ className }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-neutral-100 text-neutral-300',
        className,
      )}
      aria-hidden
    >
      <span className="text-base font-semibold leading-none">?</span>
    </div>
  );
}

function PostThumbnail({ thumb, isCarousel, className }) {
  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-neutral-100', className)}>
      {thumb?.public_url ? (
        isVideo(thumb.mime_type) ? (
          <video src={thumb.public_url} className="h-full w-full object-cover" muted />
        ) : (
          <img src={thumb.public_url} alt="" className="h-full w-full object-cover" />
        )
      ) : (
        <MediaPlaceholder className="h-full w-full" />
      )}
      {isCarousel && (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/50 px-1 text-[8px] text-white">
          +
        </span>
      )}
    </div>
  );
}

function CalendarMetaRow({ post }) {
  const hasPlatforms = post.publish_facebook || post.publish_instagram;

  return (
    <div className="flex min-w-0 items-center gap-1">
      <PostStatusIconRow post={post} size="sm" />
      {hasPlatforms && (
        <>
          <span className="h-3 w-px shrink-0 bg-neutral-200" aria-hidden />
          <div className="flex shrink-0 items-center gap-0.5">
            {post.publish_facebook && <PlatformChip platform="facebook" iconOnly />}
            {post.publish_instagram && <PlatformChip platform="instagram" iconOnly />}
          </div>
        </>
      )}
    </div>
  );
}

function ScheduleUrgencyBadge({ scheduleUrgency, className, inline = false }) {
  if (!scheduleUrgency) return null;

  return (
    <span
      className={cn(
        'rounded-full px-1 py-0.5 text-[8px] font-semibold leading-tight',
        !inline && 'absolute',
        scheduleUrgency.badgeClass,
        className,
      )}
      title={scheduleUrgency.urgencyLabel}
    >
      {scheduleUrgency.shortLabel}
    </span>
  );
}

export function CalendarPostCard({
  post,
  className,
  compact = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
  navSearch = '',
}) {
  const navigate = useNavigate();
  const didDragRef = useRef(false);
  const scheduleUrgency = shouldShowScheduleUrgency(post)
    ? getScheduleUrgency(post.scheduled_at)
    : null;
  const cardBorderClass = scheduleUrgency?.borderClass ?? 'border-neutral-200';
  const media = (post.post_media || []).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const thumb = media[0];
  const title =
    post.internal_name ||
    (post.caption ? `${post.caption.slice(0, 36)}${post.caption.length > 36 ? '…' : ''}` : 'Untitled');
  const calendarDate = getPostCalendarDate(post);
  const timeLabel = calendarDate ? format(new Date(calendarDate), 'h:mm a') : null;
  const isCarousel = media.length > 1;

  const handleClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    navigate(`/app/posts/${post.id}${navSearch}`);
  };

  const handleDragStart = (e) => {
    didDragRef.current = false;
    e.dataTransfer.setData('text/plain', post.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(e, post);
  };

  const handleDragEnd = (e) => {
    didDragRef.current = true;
    onDragEnd?.(e, post);
  };

  const cardClassName = cn(
    'relative mb-1 w-full overflow-hidden rounded-hyve-sm border bg-white text-left shadow-sm',
    'transition-[transform,box-shadow] duration-200 ease-out hover:scale-[0.98] hover:shadow-md motion-reduce:transition-none motion-reduce:hover:scale-100',
    cardBorderClass,
    draggable && 'cursor-grab active:cursor-grabbing',
    isDragging && 'scale-100 opacity-50',
    className,
  );

  if (compact) {
    return (
      <button
        type="button"
        draggable={draggable}
        onClick={handleClick}
        onDragStart={draggable ? handleDragStart : undefined}
        onDragEnd={draggable ? handleDragEnd : undefined}
        className={cn(cardClassName, 'flex items-center gap-2 p-1.5')}
      >
        <PostThumbnail thumb={thumb} isCarousel={isCarousel} className="h-10 w-10 rounded-[6px]" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 items-baseline gap-1">
            <p className="truncate text-[11px] font-medium leading-tight">{title}</p>
            {timeLabel && (
              <>
                <span className="shrink-0 text-[10px] text-neutral-300" aria-hidden>
                  ·
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeLabel}</span>
              </>
            )}
          </div>
          <div className="flex min-w-0 items-center justify-between gap-1">
            <CalendarMetaRow post={post} />
            <ScheduleUrgencyBadge scheduleUrgency={scheduleUrgency} inline className="shrink-0" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      draggable={draggable}
      onClick={handleClick}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable ? handleDragEnd : undefined}
      className={cn(cardClassName, 'mb-1.5')}
    >
      <PostThumbnail thumb={thumb} isCarousel={isCarousel} className="h-14 w-full" />
      <ScheduleUrgencyBadge
        scheduleUrgency={scheduleUrgency}
        className="right-1 top-1 z-10 px-1.5 py-0.5 text-[9px] shadow-sm"
      />
      <div className="space-y-0.5 p-1.5">
        <p className="truncate text-xs font-medium leading-tight">{title}</p>
        {timeLabel && (
          <p className="text-[10px] text-muted-foreground">{timeLabel}</p>
        )}
        <CalendarMetaRow post={post} />
      </div>
    </button>
  );
}
