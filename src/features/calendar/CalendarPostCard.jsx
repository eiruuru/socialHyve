import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { getPostDisplayBadges } from '@/features/queue/postStatus';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { isVideo } from '@/features/posts/previews/mediaUtils';
import { cn } from '@/lib/utils';

export function CalendarPostCard({ post, className }) {
  const navigate = useNavigate();
  const badges = getPostDisplayBadges(post);
  const media = (post.post_media || []).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const thumb = media[0];
  const title =
    post.internal_name ||
    (post.caption ? `${post.caption.slice(0, 36)}${post.caption.length > 36 ? '…' : ''}` : 'Untitled');
  const timeLabel = post.scheduled_at
    ? format(new Date(post.scheduled_at), 'h:mm a')
    : null;
  const isCarousel = media.length > 1;

  return (
    <button
      type="button"
      onClick={() => navigate(`/app/posts/${post.id}`)}
      className={cn(
        'mb-1.5 w-full overflow-hidden rounded-hyve-sm border border-neutral-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="flex gap-2 p-1.5">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-neutral-100">
          {thumb?.public_url ? (
            isVideo(thumb.mime_type) ? (
              <video src={thumb.public_url} className="h-full w-full object-cover" muted />
            ) : (
              <img src={thumb.public_url} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">—</div>
          )}
          {isCarousel && (
            <span className="absolute bottom-0 right-0 rounded-tl bg-black/50 px-0.5 text-[8px] text-white">
              +
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium leading-tight">{title}</p>
          {timeLabel && (
            <p className="text-[10px] text-muted-foreground">{timeLabel}</p>
          )}
          <div className="mt-0.5 flex items-center gap-1">
            {badges.map((b) => (
              <StatusBadge key={b.variant} variant={b.variant} label={b.label} className="scale-90 origin-left" />
            ))}
          </div>
          <div className="mt-0.5 flex gap-0.5">
            {post.publish_facebook && <PlatformChip platform="facebook" className="scale-75 origin-left" />}
            {post.publish_instagram && <PlatformChip platform="instagram" className="scale-75 origin-left" />}
          </div>
        </div>
      </div>
    </button>
  );
}
