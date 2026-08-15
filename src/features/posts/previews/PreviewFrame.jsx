import { format } from 'date-fns';

export function PreviewFrame({ platform, scheduledAt, children }) {
  const platformLabel = platform === 'facebook' ? 'Facebook Preview' : 'Instagram Preview';
  const dateLabel = scheduledAt
    ? format(new Date(scheduledAt), 'MMM d, yyyy - h:mm a')
    : null;

  return (
    <div className="rounded-hyve-lg bg-neutral-100 p-4">
      <div className="mb-3 text-center">
        <p className="text-sm font-semibold text-ink">{platformLabel}</p>
        {dateLabel && (
          <p className="text-xs text-muted-foreground">{dateLabel}</p>
        )}
      </div>
      <div className="overflow-hidden rounded-hyve-md bg-white shadow-sm">
        {children}
      </div>
    </div>
  );
}
