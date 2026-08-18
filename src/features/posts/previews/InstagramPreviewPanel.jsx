import { useEffect, useState } from 'react';
import { Film, LayoutGrid, Square } from 'lucide-react';
import { InstagramFeedPreview } from './InstagramFeedPreview';
import { InstagramGridPreview } from './InstagramGridPreview';
import { InstagramReelsPreview } from './InstagramReelsPreview';
import { InstagramStoriesPreview } from './InstagramStoriesPreview';
import { PreviewFrame } from './PreviewFrame';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { cn } from '@/lib/utils';

function IconToggle({ active, onClick, title, description, children }) {
  return (
    <IconTooltip title={title} description={description}>
      <button
        type="button"
        onClick={onClick}
        aria-label={title}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors',
          active ? 'bg-honey text-white' : 'text-muted-foreground hover:bg-neutral-200 hover:text-ink'
        )}
      >
        {children}
      </button>
    </IconTooltip>
  );
}

function placementToContentFilter(placement) {
  if (placement === 'reels') return 'reels';
  if (placement === 'stories') return 'stories';
  return 'posts';
}

export function InstagramPreviewPanel({
  caption,
  media,
  scheduledAt,
  scheduleTimezone,
  clientId,
  currentPostId,
  publishInstagram = true,
  instagramAccountId = null,
  placement = 'feed',
}) {
  const [viewMode, setViewMode] = useState('post');
  const [contentFilter, setContentFilter] = useState(placementToContentFilter(placement));
  const [showFuturePosts, setShowFuturePosts] = useState(true);
  const drivenByFineTune = placement && placement !== 'feed';

  useEffect(() => {
    setContentFilter(placementToContentFilter(placement));
  }, [placement]);

  const toolbar = (
    <>
      <IconToggle
        active={viewMode === 'post'}
        onClick={() => setViewMode('post')}
        title="Post preview"
        description="See how this post looks in the feed"
      >
        <Square className="h-4 w-4" />
      </IconToggle>
      <IconToggle
        active={viewMode === 'grid'}
        onClick={() => setViewMode('grid')}
        title="Grid preview"
        description="See placement on the profile grid"
      >
        <LayoutGrid className="h-4 w-4" />
      </IconToggle>
      {!drivenByFineTune && (
        <>
          <span className="mx-1 h-4 w-px bg-neutral-300" />
          <IconToggle
            active={contentFilter === 'posts'}
            onClick={() => setContentFilter('posts')}
            title="Posts"
            description="Show feed posts in the grid"
          >
            <Square className="h-3.5 w-3.5" />
          </IconToggle>
          <IconToggle
            active={contentFilter === 'reels'}
            onClick={() => setContentFilter('reels')}
            title="Reels"
            description="Preview as an Instagram Reel"
          >
            <Film className="h-4 w-4" />
          </IconToggle>
        </>
      )}
    </>
  );

  const footer = viewMode === 'grid' ? (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={showFuturePosts}
          onChange={(e) => setShowFuturePosts(e.target.checked)}
        />
        Show future posts
      </label>
      <p className="text-[11px] text-muted-foreground/80">
        When unchecked, shows posts up to the one you&apos;re viewing. Facebook-only posts are excluded.
      </p>
    </div>
  ) : null;

  const content = viewMode === 'post' ? (
    contentFilter === 'reels' ? (
      <InstagramReelsPreview caption={caption} media={media} instagramAccountId={instagramAccountId} />
    ) : contentFilter === 'stories' ? (
      <InstagramStoriesPreview caption={caption} media={media} instagramAccountId={instagramAccountId} />
    ) : (
      <InstagramFeedPreview caption={caption} media={media} embedded instagramAccountId={instagramAccountId} />
    )
  ) : contentFilter === 'reels' ? (
    <div className="flex aspect-[9/16] max-h-64 items-center justify-center text-sm text-muted-foreground">
      Reels grid preview coming soon
    </div>
  ) : (
    <InstagramGridPreview
      clientId={clientId}
      currentPostId={currentPostId}
      scheduledAt={scheduledAt}
      media={media}
      showFuturePosts={showFuturePosts}
      publishInstagram={publishInstagram}
    />
  );

  return (
    <PreviewFrame
      platform="instagram"
      scheduledAt={scheduledAt}
      scheduleTimezone={scheduleTimezone}
      toolbar={toolbar}
      footer={footer}
    >
      {content}
    </PreviewFrame>
  );
}
