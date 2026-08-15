import { CheckCircle2, CircleAlert, Clock3, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatImportLogTime } from '@/lib/postImportLog';

const STATUS_META = {
  created: {
    label: 'Created',
    icon: CheckCircle2,
    className: 'text-green-700',
  },
  failed: {
    label: 'Failed',
    icon: CircleAlert,
    className: 'text-red-600',
  },
  skipped: {
    label: 'Skipped',
    icon: MinusCircle,
    className: 'text-muted-foreground',
  },
};

function LogEntry({ entry }) {
  const meta = STATUS_META[entry.status] || STATUS_META.skipped;
  const Icon = meta.icon;

  return (
    <li className="flex gap-2 border-t border-neutral-100 px-3 py-2 text-sm first:border-t-0">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', meta.className)} />
      <div className="min-w-0 flex-1">
        <p className="text-ink">
          <span className="font-mono text-xs text-muted-foreground">Row {entry.rowIndex}</span>
          {' · '}
          <span className="font-medium">{entry.name}</span>
        </p>
        {entry.message && (
          <p className="mt-0.5 text-xs text-muted-foreground">{entry.message}</p>
        )}
      </div>
      <span className={cn('shrink-0 text-xs font-medium', meta.className)}>{meta.label}</span>
    </li>
  );
}

function SessionBlock({ session, defaultOpen = false }) {
  const summary = `${session.summary.created} created`;
  const extras = [];
  if (session.summary.failed) extras.push(`${session.summary.failed} failed`);
  if (session.summary.skipped) extras.push(`${session.summary.skipped} skipped`);

  return (
    <details
      className="rounded-hyve-sm border border-neutral-200 bg-white"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">{session.fileName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatImportLogTime(session.completedAt)}
              {' · '}
              {summary}
              {extras.length ? ` · ${extras.join(', ')}` : ''}
            </p>
          </div>
          <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </summary>
      <ul className="border-t border-neutral-200 bg-neutral-50/50">
        {session.entries.map((entry) => (
          <LogEntry key={`${session.id}-${entry.rowIndex}-${entry.status}`} entry={entry} />
        ))}
      </ul>
    </details>
  );
}

export function ImportLogPanel({
  history = [],
  liveSession = null,
  onClear,
}) {
  const hasLive = liveSession && liveSession.entries.length > 0;
  const hasHistory = history.length > 0;

  if (!hasLive && !hasHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Import log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No imports yet for this client.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="font-display text-lg">Import log</CardTitle>
        {hasHistory && onClear && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear history
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {hasLive && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-honey-dark">
              {liveSession.inProgress ? 'In progress' : 'Latest import'}
            </p>
            <div className="rounded-hyve-sm border border-honey/30 bg-honey-light/20">
              <div className="border-b border-honey/20 px-3 py-2">
                <p className="text-sm font-medium text-ink">{liveSession.fileName}</p>
                {liveSession.inProgress && (
                  <p className="text-xs text-muted-foreground">Processing rows…</p>
                )}
              </div>
              <ul>
                {liveSession.entries.map((entry) => (
                  <LogEntry key={`live-${entry.rowIndex}-${entry.status}-${entry.name}`} entry={entry} />
                ))}
              </ul>
            </div>
          </div>
        )}

        {hasHistory && (
          <div className="space-y-2">
            {hasLive && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Previous imports
              </p>
            )}
            {history.map((session, index) => (
              <SessionBlock
                key={session.id}
                session={session}
                defaultOpen={!hasLive && index === 0}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
