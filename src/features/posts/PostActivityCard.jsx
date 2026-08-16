import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatActivityDetail } from './postActivityUtils';

export function PostActivityCard({ activity = [], emptyMessage = 'No activity yet.' }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2">
            {activity.map((entry) => (
              <li key={entry.id} className="text-sm">
                <span className="text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
                {' — '}
                {formatActivityDetail(entry)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
