import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clapperboard, Layers } from 'lucide-react';
import { listPosts } from '@/lib/posts';
import { isVideo } from './mediaUtils';
import { cn } from '@/lib/utils';

function GridCell({ post, isCurrent, onClick }) {
  const media = (post.post_media || []).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const thumb = media[0];
  const isCarousel = media.length > 1;
  const hasVideo = thumb && isVideo(thumb.mime_type);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative aspect-square overflow-hidden bg-neutral-200',
        isCurrent && 'ring-2 ring-honey ring-offset-1'
      )}
    >
      {thumb?.public_url ? (
        isVideo(thumb.mime_type) ? (
          <video src={thumb.public_url} className="h-full w-full object-cover" muted />
        ) : (
          <img src={thumb.public_url} alt="" className="h-full w-full object-cover" />
        )
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-neutral-400">No media</div>
      )}
      {(isCarousel || hasVideo) && (
        <div className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white">
          {hasVideo ? <Clapperboard className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
        </div>
      )}
    </button>
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

  const gridPosts = useMemo(() => {
    const statuses = showFuturePosts
      ? ['published', 'scheduled', 'draft']
      : ['published'];

    let posts = siblingPosts.filter((p) =>
      statuses.includes(p.status) || (showFuturePosts && p.status === 'draft')
    );

    if (currentPostId && !posts.some((p) => p.id === currentPostId)) {
      posts = [
        ...posts,
        {
          id: currentPostId,
          scheduled_at: scheduledAt,
          post_media: media.map((m, i) => ({ ...m, sort_order: i })),
        },
      ];
    }

    posts.sort((a, b) => {
      const da = new Date(a.scheduled_at || a.created_at || 0).getTime();
      const db = new Date(b.scheduled_at || b.created_at || 0).getTime();
      return db - da;
    });

    const minCells = 6;
    while (posts.length < minCells) {
      posts.push({ id: `placeholder-${posts.length}`, placeholder: true });
    }

    return posts.slice(0, 9);
  }, [siblingPosts, currentPostId, scheduledAt, media, showFuturePosts]);

  return (
    <div className="grid max-h-[320px] grid-cols-3 gap-0.5 overflow-y-auto bg-white p-1">
      {gridPosts.map((post) =>
        post.placeholder ? (
          <div key={post.id} className="aspect-square bg-neutral-100" />
        ) : (
          <GridCell
            key={post.id}
            post={post}
            isCurrent={post.id === currentPostId}
          />
        )
      )}
    </div>
  );
}
