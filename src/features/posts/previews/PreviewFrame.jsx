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
    <div className="rounded-hyve-lg bg-neutral-100 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-ink">{platformLabel}</p>
          {dateLabel && (
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
          )}
        </div>
        {toolbar && <div className="flex items-center gap-1">{toolbar}</div>}
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
