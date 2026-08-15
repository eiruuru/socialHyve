import { cn } from '@/lib/utils';

export function PlatformChip({ platform, className }) {
  const isFb = platform === 'facebook';

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
