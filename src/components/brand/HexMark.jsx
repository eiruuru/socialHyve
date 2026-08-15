import { cn } from '@/lib/utils';

export function HexMark({ className, variant = 'default', size = 34 }) {
  const isDark = variant === 'dark';
  const isCheck = variant === 'check';

  if (isCheck) {
    return (
      <span className={cn('inline-flex', className)} style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <polygon points="50,3 93,26 93,74 50,97 7,74 7,26" fill="#14110C" />
          <path d="M32 50 L45 63 L70 35" fill="none" stroke="#F6A600" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <polygon
          points="50,3 93,26 93,74 50,97 7,74 7,26"
          fill="none"
          stroke={isDark ? '#F6A600' : '#14110C'}
          strokeWidth="7"
        />
        <circle cx="50" cy="50" r="10" fill="#F6A600" />
      </svg>
    </span>
  );
}
