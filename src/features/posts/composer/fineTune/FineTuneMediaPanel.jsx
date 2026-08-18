import { AlertTriangle } from 'lucide-react';
import { MediaStrip } from '@/features/posts/MediaStrip';
import { isVideo } from '@/features/posts/previews/mediaUtils';
import { PLACEMENT_LABELS } from '@/features/posts/platformOverrides';

export function FineTuneMediaPanel({ media, onMediaChange, placement, platform }) {
  const warnings = [];
  const hasVideo = media.some((m) => isVideo(m.mime_type));

  if (placement === 'reels' && !hasVideo) {
    warnings.push(`${PLACEMENT_LABELS.reels} requires a video.`);
  }
  if (placement === 'stories' && media.length > 1) {
    warnings.push('Stories with multiple items may require manual publish.');
  }
  if (platform === 'facebook' && placement === 'carousel' && media.length < 2) {
    warnings.push('Carousel placement works best with 2 or more images.');
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Media</p>
      <MediaStrip items={media} onChange={onMediaChange} />
      {warnings.map((warning) => (
        <div key={warning} className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}
