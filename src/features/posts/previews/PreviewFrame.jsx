import { formatScheduledLabel } from '@/lib/scheduleTime';
import { cn } from '@/lib/utils';

export function PreviewFrame({
  platform,
  scheduledAt,
  scheduleTimezone,
  toolbar,
  footer,
  layout = 'feed',
  children,
}) {
  const platformLabel = platform === 'facebook' ? 'Facebook Preview' : 'Instagram Preview';
  const dateLabel = scheduledAt
    ? formatScheduledLabel(scheduledAt, scheduleTimezone)
    : null;
  const isVertical = layout === 'vertical';

  return (
    <div className="min-w-0 overflow-x-hidden rounded-hyve-lg bg-neutral-100 p-3">
      <div className="mb-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-sm font-semibold text-ink">{platformLabel}</p>
          {dateLabel && (
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
          )}
        </div>
        {toolbar && (
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-1 sm:justify-end">
            {toolbar}
          </div>
        )}
      </div>
      {footer && <div className="mb-2">{footer}</div>}
      <div
        className={cn(
          'overflow-hidden rounded-hyve-md bg-white',
          isVertical && 'flex min-h-[420px] items-center justify-center px-4 py-6',
        )}
      >
        {children}
      </div>
    </div>
  );
}
