import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listPosts } from '@/lib/posts';
import { useClient } from '@/lib/clientContext';
import { ContentCalendar } from '@/features/calendar/ContentCalendar';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { Button } from '@/components/ui/button';

export default function CalendarPage() {
  const { activeClient } = useClient();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', activeClient?.id],
    queryFn: () => listPosts(),
    enabled: !!activeClient,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Schedule</p>
          <h2 className="font-display text-2xl font-bold">Content Calendar</h2>
          <p className="text-muted-foreground">Plan and schedule your social posts</p>
        </div>
        <Button asChild>
          <Link to="/app/posts/new">New Post</Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading calendar…</p>
      ) : posts.length === 0 ? (
        <EmptyHiveState
          title="No posts on the calendar yet."
          description="Draft the next one and it'll show up here."
        />
      ) : (
        <ContentCalendar posts={posts} />
      )}
    </div>
  );
}
