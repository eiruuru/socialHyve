import { cn } from '@/lib/utils';

export function MarketingScreenshot({ src, alt, className, priority = false, onError }) {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={onError}
      className={cn('block h-auto w-full bg-neutral-50', className)}
    />
  );
}
