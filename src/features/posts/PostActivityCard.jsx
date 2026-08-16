import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ACTIVITY_TONE_META,
  formatActivityDetail,
  getActivityTone,
} from './postActivityUtils';

function ActivityToneDot({ tone }) {
  const meta = ACTIVITY_TONE_META[tone];
  return (
    <span
      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', meta.dotClass)}
      title={meta.label}
      aria-label={meta.label}
    />
  );
}

export function PostActivityCard({ activity = [], emptyMessage = 'No activity yet.' }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <>
            <ul className="space-y-2.5">
              {activity.map((entry) => {
                const tone = getActivityTone(entry);
                return (
                  <li key={entry.id} className="flex gap-2.5 text-sm">
                    <ActivityToneDot tone={tone} />
                    <div className="min-w-0">
                      <span className="text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                      {' — '}
                      {formatActivityDetail(entry)}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-[11px] text-muted-foreground">
              {Object.entries(ACTIVITY_TONE_META).map(([tone, meta]) => (
                <span key={tone} className="inline-flex items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClass)} />
                  {meta.label}
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
