import { useState } from 'react';
import { InstagramFeedPreview } from './InstagramFeedPreview';
import { InstagramGridPreview } from './InstagramGridPreview';
import { cn } from '@/lib/utils';

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-neutral-100 p-0.5">
          {['post', 'grid'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                viewMode === mode ? 'bg-honey text-white' : 'text-muted-foreground hover:text-ink'
              )}
            >
              {mode === 'post' ? 'Post Preview' : 'Grid Preview'}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-full bg-neutral-100 p-0.5">
          {['posts', 'reels'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setContentFilter(filter)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                contentFilter === filter ? 'bg-honey text-white' : 'text-muted-foreground hover:text-ink'
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'grid' && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showFuturePosts}
            onChange={(e) => setShowFuturePosts(e.target.checked)}
          />
          Show future socialHyve posts
        </label>
      )}

      {viewMode === 'post' ? (
        <InstagramFeedPreview caption={caption} media={media} />
      ) : contentFilter === 'reels' ? (
        <div className="flex aspect-[9/16] max-h-64 items-center justify-center bg-neutral-100 text-sm text-muted-foreground">
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
      )}
    </div>
  );
}
