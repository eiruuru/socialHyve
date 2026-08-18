import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MarketingScreenshot } from './MarketingScreenshot';

export function MarketingChromeFrame({
  url,
  children,
  screenshot,
  screenshotAlt,
  className,
  imageClassName,
  priority = false,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showScreenshot = screenshot && !imageFailed;

  return (
    <div className={cn('overflow-hidden rounded-hyve-lg border border-neutral-200 bg-white shadow-hyve-md', className)}>
      <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-100 px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#EF6A5F]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#F5BD4F]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#61C454]" />
        <span className="ml-2.5 truncate rounded-md border border-neutral-200 bg-white px-2.5 py-0.5 font-mono text-[11px] text-neutral-500">
          {url}
        </span>
      </div>
      {showScreenshot ? (
        <MarketingScreenshot
          src={screenshot}
          alt={screenshotAlt || url}
          className={imageClassName}
          priority={priority}
          onError={() => setImageFailed(true)}
        />
      ) : (
        children
      )}
    </div>
  );
}
