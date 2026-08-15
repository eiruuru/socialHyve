import { cn } from '@/lib/utils';
import { HexMark } from './HexMark';

export function Logo({ variant = 'light', className, showMark = true }) {
  const isDark = variant === 'dark';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {showMark && <HexMark variant={isDark ? 'dark' : 'default'} size={34} />}
      <span
        className={cn(
          'font-display text-xl font-bold',
          isDark ? 'text-white' : 'text-ink'
        )}
      >
        social<span className={isDark ? 'text-honey' : 'text-honey-dark'}>Hyve</span>
      </span>
    </div>
  );
}
