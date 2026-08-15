import { useRef } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { getPostDisplayBadges } from '@/features/queue/postStatus';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { isVideo } from '@/features/posts/previews/mediaUtils';
import { cn } from '@/lib/utils';

const NON_DRAGGABLE_STATUSES = new Set(['published', 'publishing']);

export function isPostDraggable(post) {
  return post && !NON_DRAGGABLE_STATUSES.has(post.status);
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
        <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">No media</div>
      )}
      {isCarousel && (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/50 px-1 text-[8px] text-white">
          +
        </span>
      )}
    </div>
  );
}

export function CalendarPostCard({
  post,
  className,
  layout = 'stacked',
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
  navSearch = '',
}) {
  const navigate = useNavigate();
  const didDragRef = useRef(false);
  const badges = getPostDisplayBadges(post);
  const media = (post.post_media || []).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const thumb = media[0];
  const title =
    post.internal_name ||
    (post.caption ? `${post.caption.slice(0, 36)}${post.caption.length > 36 ? '…' : ''}` : 'Untitled');
  const timeLabel = post.scheduled_at
    ? format(new Date(post.scheduled_at), 'h:mm a')
    : null;
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

  if (layout === 'horizontal') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-3 overflow-hidden rounded-hyve-sm border border-neutral-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md',
          isDragging && 'opacity-50',
          className,
        )}
      >
        <PostThumbnail thumb={thumb} isCarousel={isCarousel} className="h-[72px] w-[72px] rounded-hyve-sm" />
        <div className="min-w-0 flex-1 space-y-1 py-1 pr-3">
          <p className="truncate text-sm font-medium leading-tight">{title}</p>
          <div className="flex flex-wrap items-center gap-1">
            {badges.map((b) => (
              <StatusBadge key={b.variant} variant={b.variant} label={b.label} className="scale-90 origin-left" />
            ))}
          </div>
          <div className="flex gap-1">
            {post.publish_facebook && <PlatformChip platform="facebook" iconOnly />}
            {post.publish_instagram && <PlatformChip platform="instagram" iconOnly />}
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
      className={cn(
        'mb-1.5 w-full overflow-hidden rounded-hyve-sm border border-neutral-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md',
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50',
        className,
      )}
    >
      <PostThumbnail thumb={thumb} isCarousel={isCarousel} className="h-14 w-full" />
      <div className="space-y-0.5 p-1.5">
        <p className="truncate text-xs font-medium leading-tight">{title}</p>
        {timeLabel && (
          <p className="text-[10px] text-muted-foreground">{timeLabel}</p>
        )}
        <div className="flex items-center gap-1">
          {badges.map((b) => (
            <StatusBadge key={b.variant} variant={b.variant} label={b.label} className="scale-90 origin-left" />
          ))}
        </div>
        <div className="flex gap-1 pt-0.5">
          {post.publish_facebook && <PlatformChip platform="facebook" iconOnly />}
          {post.publish_instagram && <PlatformChip platform="instagram" iconOnly />}
        </div>
      </div>
    </button>
  );
}
