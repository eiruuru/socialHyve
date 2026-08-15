import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clapperboard, Layers } from 'lucide-react';
import { listPosts } from '@/lib/posts';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { normalizeMediaList, isVideo } from './mediaUtils';
import { cn } from '@/lib/utils';

function GridCell({ post, isCurrent }) {
  const media = normalizeMediaList(post.post_media || []);
  const thumb = media[0];
  const isCarousel = post.isCarousel || media.length > 1;
  const hasVideo = thumb && isVideo(thumb.mime_type);

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
    </Wrapper>
  );
}

export function InstagramGridPreview({
  clientId,
  currentPostId,
  scheduledAt,
  media = [],
  showFuturePosts = true,
}) {
  const { data: siblingPosts = [] } = useQuery({
    queryKey: ['ig-grid-posts', clientId, showFuturePosts],
    queryFn: () =>
      listPosts({
        clientId,
        publishInstagram: true,
        includeFuture: showFuturePosts,
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
    const statuses = showFuturePosts
      ? ['published', 'scheduled', 'draft']
      : ['published'];

    const composingId = currentPostId || '__composing__';
    let posts = siblingPosts.filter((p) =>
      statuses.includes(p.status) || (showFuturePosts && p.status === 'draft'),
    );

    if (media.length > 0 && !posts.some((p) => p.id === currentPostId || p.id === composingId)) {
      posts.push({
        id: composingId,
        scheduled_at: scheduledAt || new Date().toISOString(),
        post_media: media.map((m, i) => ({ ...m, sort_order: i })),
        isComposing: true,
      });
    } else if (currentPostId && media.length > 0) {
      posts = posts.map((p) =>
        p.id === currentPostId
          ? { ...p, post_media: media.map((m, i) => ({ ...m, sort_order: i })), isComposing: false }
          : p,
      );
    }

    if (showFuturePosts) {
      const existingIds = new Set(posts.map((p) => p.id));
      for (const igPost of igLivePosts) {
        if (!existingIds.has(igPost.id)) posts.push(igPost);
      }
    }

    posts.sort((a, b) => {
      const da = new Date(a.scheduled_at || a.timestamp || a.created_at || 0).getTime();
      const db = new Date(b.scheduled_at || b.timestamp || b.created_at || 0).getTime();
      return db - da;
    });

    const result = posts.slice(0, 9);
    while (result.length < 6) {
      result.push({ id: `placeholder-${result.length}`, placeholder: true });
    }

    return result.slice(0, 9);
  }, [siblingPosts, igLivePosts, currentPostId, scheduledAt, media, showFuturePosts]);

  return (
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
  );
}
