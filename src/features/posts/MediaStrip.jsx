import { ChevronLeft, ChevronRight, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { MAX_CAROUSEL_ITEMS, isVideo, reorderMedia } from '@/features/posts/previews/mediaUtils';

export function MediaStrip({ items, onChange, maxItems = MAX_CAROUSEL_ITEMS }) {
  const atLimit = items.length >= maxItems;

  const move = (index, direction) => {
    const to = index + direction;
    if (to < 0 || to >= items.length) return;
    onChange(reorderMedia(items, index, to));
  };

  const remove = (index) => {
    const next = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sort_order: i }));
    onChange(next);
  };

  if (!items.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Add up to {maxItems} images or videos. Multiple items create a carousel on Instagram and Facebook.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {items.length}/{maxItems} items {items.length > 1 ? '(carousel)' : ''}
      </p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${item.public_url}-${index}`} className="flex items-center gap-2 rounded-md border p-2">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
            {isVideo(item.mime_type) ? (
              <video src={item.public_url} className="h-14 w-14 rounded object-cover" muted />
            ) : (
              <img src={item.public_url} alt="" className="h-14 w-14 rounded object-cover" />
            )}
            <span className="flex-1 truncate text-xs text-muted-foreground">
              {item.source === 'canva' ? 'Canva design' : 'Upload'} · #{index + 1}
            </span>
            <div className="flex gap-1">
              <IconTooltip title="Move earlier" description="Move this item left in the carousel">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move earlier">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </IconTooltip>
              <IconTooltip title="Move later" description="Move this item right in the carousel">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label="Move later">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </IconTooltip>
              <IconTooltip title="Remove" description="Remove this item from the post">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(index)} aria-label="Remove media">
                  <X className="h-4 w-4" />
                </Button>
              </IconTooltip>
            </div>
          </div>
        ))}
      </div>
      {atLimit && (
        <p className="text-xs text-amber-600">Maximum {maxItems} items for carousel posts.</p>
      )}
    </div>
  );
}

export { MAX_CAROUSEL_ITEMS };
