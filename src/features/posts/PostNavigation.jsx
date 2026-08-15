import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';

export function PostNavigation({ prevHref, nextHref, position, total, className }) {
  if (!total || total <= 1) return null;

  return (
    <div className={className ?? 'flex items-center gap-1'}>
      <IconTooltip title="Previous post" description={prevHref ? 'Go to the previous post' : 'No previous post'}>
        <Button
          size="icon"
          variant="outline"
          asChild={!!prevHref}
          disabled={!prevHref}
          aria-label="Previous post"
        >
          {prevHref ? (
            <Link to={prevHref}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </IconTooltip>
      {position != null && (
        <span className="min-w-[4.5rem] text-center text-xs text-muted-foreground">
          {position} of {total}
        </span>
      )}
      <IconTooltip title="Next post" description={nextHref ? 'Go to the next post' : 'No next post'}>
        <Button
          size="icon"
          variant="outline"
          asChild={!!nextHref}
          disabled={!nextHref}
          aria-label="Next post"
        >
          {nextHref ? (
            <Link to={nextHref}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </IconTooltip>
    </div>
  );
}
