import { useState } from 'react';
import { Film, LayoutGrid, Square } from 'lucide-react';
import { InstagramFeedPreview } from './InstagramFeedPreview';
import { InstagramGridPreview } from './InstagramGridPreview';
import { PreviewFrame } from './PreviewFrame';
import { cn } from '@/lib/utils';

function IconToggle({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors',
        active ? 'bg-honey text-white' : 'text-muted-foreground hover:bg-neutral-200 hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}

export function InstagramPreviewPanel({
  caption,
  media,
  scheduledAt,
  clientId,
  currentPostId,
}) {
  const [viewMode, setViewMode] = useState('post');
  const [contentFilter, setContentFilter] = useState('posts');
  const [showFuturePosts, setShowFuturePosts] = useState(true);

  const toolbar = (
    <>
      <IconToggle
        active={viewMode === 'post'}
        onClick={() => setViewMode('post')}
        title="Post preview"
      >
        <Square className="h-4 w-4" />
      </IconToggle>
      <IconToggle
        active={viewMode === 'grid'}
        onClick={() => setViewMode('grid')}
        title="Grid preview"
      >
        <LayoutGrid className="h-4 w-4" />
      </IconToggle>
      <span className="mx-1 h-4 w-px bg-neutral-300" />
      <IconToggle
        active={contentFilter === 'posts'}
        onClick={() => setContentFilter('posts')}
        title="Posts"
      >
        <Square className="h-3.5 w-3.5" />
      </IconToggle>
      <IconToggle
        active={contentFilter === 'reels'}
        onClick={() => setContentFilter('reels')}
        title="Reels"
      >
        <Film className="h-4 w-4" />
      </IconToggle>
    </>
  );

  const footer = viewMode === 'grid' ? (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        checked={showFuturePosts}
        onChange={(e) => setShowFuturePosts(e.target.checked)}
      />
      Show future socialHyve posts
    </label>
  ) : null;

  const content = viewMode === 'post' ? (
    <InstagramFeedPreview caption={caption} media={media} embedded />
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
    />
  );

  return (
    <PreviewFrame
      platform="instagram"
      scheduledAt={scheduledAt}
      toolbar={toolbar}
      footer={footer}
    >
      {content}
    </PreviewFrame>
  );
}
