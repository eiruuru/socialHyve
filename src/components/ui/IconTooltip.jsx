import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const IconTooltip = forwardRef(function IconTooltip(
  { title, description, children, className, side = 'top' },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn('group/icon-tip relative inline-flex', className)}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 hidden w-max max-w-[220px] rounded-hyve-sm bg-ink px-2.5 py-1.5 text-left shadow-lg group-hover/icon-tip:block',
          side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
          side === 'bottom' && 'top-full left-1/2 mt-2 -translate-x-1/2'
        )}
      >
        <span className="block text-xs font-medium text-white">{title}</span>
        {description && (
          <span className="mt-0.5 block text-[10px] leading-snug text-neutral-300">
            {description}
          </span>
        )}
      </span>
    </span>
  );
});
