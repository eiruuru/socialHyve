import { cn } from '@/lib/utils';

export function ProgressBar({ value, indeterminate = false, className }) {
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-neutral-200', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : value}
    >
      <div
        className={cn(
          'h-full rounded-full bg-honey transition-all duration-300',
          indeterminate && 'w-1/3 animate-progress-indeterminate',
        )}
        style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
