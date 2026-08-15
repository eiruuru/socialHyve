import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeAspectRatio, getAspectRatioClass, isVideo } from './mediaUtils';

function MediaSlide({ item, platform, onAspectLoad }) {
  const url = item.public_url;
  const video = isVideo(item.mime_type);

  const handleLoad = (e) => {
    const el = e.target;
    const ratio = computeAspectRatio(el.videoWidth || el.naturalWidth, el.videoHeight || el.naturalHeight);
    onAspectLoad?.(ratio);
  };

  if (!url) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center bg-gray-100 text-sm text-gray-400">
        No media
      </div>
    );
  }

  if (video) {
    return (
      <div className="relative h-full w-full bg-black">
        <video
          src={url}
          className="h-full w-full object-cover"
          muted
          playsInline
          onLoadedMetadata={handleLoad}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/50 p-3">
            <Play className="h-8 w-8 fill-white text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      className={cn('h-full w-full object-cover', platform === 'facebook' ? 'max-h-[500px]' : '')}
      onLoad={handleLoad}
    />
  );
}

export function MediaCarousel({
  items = [],
  platform = 'instagram',
  showCounter = false,
  className,
  aspectClassName,
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [aspectRatios, setAspectRatios] = useState({});

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const handleAspectLoad = (index, ratio) => {
    setAspectRatios((prev) => ({ ...prev, [index]: ratio }));
  };

  const firstRatio = aspectRatios[0] || items[0]?.aspectRatio || 1;
  const aspectClass = aspectClassName || getAspectRatioClass(firstRatio, platform);

  if (!items.length) {
    return (
      <div className={cn('flex aspect-square items-center justify-center bg-gray-100 text-sm text-gray-400', className)}>
        Media required
      </div>
    );
  }

  if (items.length === 1) {
    return (
      <div className={cn('overflow-hidden bg-black', aspectClass, className)}>
        <MediaSlide item={items[0]} platform={platform} onAspectLoad={(r) => handleAspectLoad(0, r)} />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-black', aspectClass, className)}>
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {items.map((item, index) => (
            <div key={`${item.public_url}-${index}`} className="min-w-0 flex-[0_0_100%]">
              <MediaSlide
                item={item}
                platform={platform}
                onAspectLoad={(r) => handleAspectLoad(index, r)}
              />
            </div>
          ))}
        </div>
      </div>

      {showCounter && (
        <div className="absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          {selectedIndex + 1} / {items.length}
        </div>
      )}

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {items.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => emblaApi?.scrollTo(index)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              index === selectedIndex ? 'w-1.5 bg-blue-500' : 'w-1.5 bg-white/50'
            )}
          />
        ))}
      </div>
    </div>
  );
}
