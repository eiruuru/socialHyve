import { cn } from '@/lib/utils';

const ICON_ONLY_SIZE = {
  sm: 'h-5 w-5 text-[10px]',
  md: 'h-7 w-7 text-xs',
  lg: 'h-9 w-9 text-sm',
};

export function PlatformChip({ platform, className, iconOnly = false, iconSize = 'sm' }) {
  const isFb = platform === 'facebook';

  if (iconOnly) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white',
          ICON_ONLY_SIZE[iconSize] ?? ICON_ONLY_SIZE.sm,
          isFb ? 'bg-platform-fb' : 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
          className
        )}
        title={isFb ? 'Facebook' : 'Instagram'}
      >
        {isFb ? 'f' : '◎'}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white',
        isFb ? 'bg-platform-fb' : 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
        className
      )}
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-ink">
        {isFb ? 'f' : '◎'}
      </span>
      {isFb ? 'Facebook' : 'Instagram'}
    </span>
  );
}
