import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function postLabel(post) {
  return post.internal_name || post.caption?.slice(0, 60) || 'Untitled';
}

export function ReviewPostSelector({ posts, selectedId, onSelect }) {
  if (!posts.length) return null;

  const index = Math.max(0, posts.findIndex((p) => p.id === selectedId));
  const selected = posts[index] || posts[0];
  const total = posts.length;

  const goTo = (nextIndex) => {
    const clamped = Math.max(0, Math.min(nextIndex, total - 1));
    onSelect(posts[clamped].id);
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{postLabel(selected)}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selected.id}
            onChange={(e) => onSelect(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-hyve-sm border border-input bg-background px-3 text-sm sm:min-w-[220px] sm:flex-none"
            aria-label="Select post to review"
          >
            {posts.map((post) => (
              <option key={post.id} value={post.id}>
                {postLabel(post)}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Post {index + 1} of {total}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous post"
                disabled={index <= 0}
                onClick={() => goTo(index - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next post"
                disabled={index >= total - 1}
                onClick={() => goTo(index + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
