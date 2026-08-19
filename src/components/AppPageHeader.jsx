import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppPageHeader({
  title,
  backTo = -1,
  backLabel = 'Back',
  onBack,
  className,
  children,
}) {
  const backControl = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-hyve-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-ink"
      aria-label={backLabel}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  ) : typeof backTo === 'string' ? (
    <Link
      to={backTo}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-hyve-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-ink"
      aria-label={backLabel}
    >
      <ChevronLeft className="h-5 w-5" />
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => window.history.go(backTo)}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-hyve-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-ink"
      aria-label={backLabel}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );

  return (
    <div className={cn('mb-4 flex items-center gap-3 lg:hidden', className)}>
      {backControl}
      {title && (
        <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold text-ink">
          {title}
        </h1>
      )}
      {children}
    </div>
  );
}
