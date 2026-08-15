import { format } from 'date-fns';

export function PreviewFrame({ platform, scheduledAt, toolbar, footer, children }) {
  const platformLabel = platform === 'facebook' ? 'Facebook Preview' : 'Instagram Preview';
  const dateLabel = scheduledAt
    ? format(new Date(scheduledAt), 'MMM d, yyyy - h:mm a')
    : null;

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
      <div className="overflow-hidden rounded-hyve-md bg-white">
        {children}
      </div>
    </div>
  );
}
