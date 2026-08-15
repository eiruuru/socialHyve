import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clapperboard, Layers } from 'lucide-react';
import { listPosts } from '@/lib/posts';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { normalizeMediaList, isVideo } from './mediaUtils';
import { cn } from '@/lib/utils';

const PIPELINE_STATUSES = ['draft', 'scheduled', 'failed', 'publishing'];
const MAX_GRID_POSTS = 12;
const GRID_ROWS = MAX_GRID_POSTS / 3;

function getPostSortTime(post) {
  return new Date(post.scheduled_at || post.timestamp || post.created_at || 0).getTime();
}

function shouldShowInGrid(post, { showFuturePosts, currentPostId, composingId }) {
  if (showFuturePosts) return true;
  if (post.external) return true;
  if (post.id === currentPostId || post.id === composingId || post.isComposing) return true;
  if (post.status === 'draft') return true;
  if (post.status !== 'scheduled') return true;

  const scheduledMs = post.scheduled_at ? new Date(post.scheduled_at).getTime() : NaN;
  if (Number.isNaN(scheduledMs)) return true;

  return scheduledMs <= Date.now();
}

function isInstagramPost(post) {
  return post.publish_instagram === true;
}

function GridCell({ post, isCurrent }) {
  const media = normalizeMediaList(post.post_media || []);
  const thumb = media[0];
  const isCarousel = post.isCarousel || media.length > 1;
  const hasVideo = thumb && isVideo(thumb.mime_type);
  const statusBadge =
    post.status === 'draft' ? 'Draft' : post.status === 'scheduled' ? 'Scheduled' : null;

  const content = thumb?.public_url ? (
    hasVideo ? (
      <video src={thumb.public_url} className="h-full w-full object-cover" muted />
    ) : (
      <img src={thumb.public_url} alt="" className="h-full w-full object-cover" />
    )
  ) : (
    <div className="flex h-full items-center justify-center text-xs text-neutral-400">No media</div>
  );

  const Wrapper = post.permalink ? 'a' : 'div';
  const linkProps = post.permalink
    ? { href: post.permalink, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <Wrapper
      {...linkProps}
      className={cn(
        'relative block aspect-square overflow-hidden bg-neutral-200',
        isCurrent && 'ring-2 ring-honey ring-inset',
      )}
    >
      {content}
      {(isCarousel || hasVideo) && (
        <div className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white">
          {hasVideo ? <Clapperboard className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
        </div>
      )}
      {statusBadge && (
        <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
          {statusBadge}
        </div>
      )}
    </Wrapper>
  );
}

export function InstagramGridPreview({
  clientId,
  currentPostId,
  scheduledAt,
  media = [],
  showFuturePosts = true,
  publishInstagram = true,
}) {
  const { data: siblingPosts = [] } = useQuery({
    queryKey: ['ig-grid-posts', clientId],
    queryFn: () =>
      listPosts({
        clientId,
        publishInstagram: true,
        includeFuture: true,
      }),
    enabled: !!clientId,
  });

  const { data: igLiveData } = useQuery({
    queryKey: ['ig-live-media', clientId],
    queryFn: () => invokeFunction('metaListIgMedia', { clientId }),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const igLivePosts = igLiveData?.media || [];

  const gridPosts = useMemo(() => {
    const composingId = currentPostId || '__composing__';

    let posts = siblingPosts.filter((p) => {
      if (!isInstagramPost(p)) return false;
      if (p.status === 'published') return true;
      if (PIPELINE_STATUSES.includes(p.status)) return true;
      return false;
    });

    if (publishInstagram) {
      if (media.length > 0 && !posts.some((p) => p.id === currentPostId || p.id === composingId)) {
        posts.push({
          id: composingId,
          scheduled_at: scheduledAt || new Date().toISOString(),
          post_media: media.map((m, i) => ({ ...m, sort_order: i })),
          isComposing: true,
          publish_instagram: true,
        });
      } else if (currentPostId && media.length > 0) {
        posts = posts.map((p) =>
          p.id === currentPostId
            ? { ...p, post_media: media.map((m, i) => ({ ...m, sort_order: i })), isComposing: false }
            : p,
        );
      }
    }

    const existingIds = new Set(posts.map((p) => p.id));
    for (const igPost of igLivePosts) {
      if (!existingIds.has(igPost.id)) posts.push(igPost);
    }

    posts = posts.filter((p) =>
      shouldShowInGrid(p, { showFuturePosts, currentPostId, composingId }),
    );

    posts.sort((a, b) => getPostSortTime(b) - getPostSortTime(a));

    const result = posts.slice(0, MAX_GRID_POSTS);
    if (result.length === 0) {
      return Array.from({ length: 3 }, (_, index) => ({
        id: `placeholder-${index}`,
        placeholder: true,
      }));
    }

    return result;
  }, [
    siblingPosts,
    igLivePosts,
    currentPostId,
    scheduledAt,
    media,
    showFuturePosts,
    publishInstagram,
  ]);

  return (
    <div
      className="w-full overflow-y-auto overscroll-contain"
      style={{ aspectRatio: `3 / ${GRID_ROWS}`, minHeight: '32rem' }}
    >
      <div className="grid grid-cols-3 gap-px bg-neutral-200">
        {gridPosts.map((post) =>
          post.placeholder ? (
            <div key={post.id} className="aspect-square bg-neutral-100" />
          ) : (
            <GridCell
              key={post.id}
              post={post}
              isCurrent={post.id === currentPostId || post.isComposing}
            />
          ),
        )}
      </div>
    </div>
  );
}
