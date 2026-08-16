import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listPosts } from '@/lib/posts';
import { useClient } from '@/lib/clientContext';
import { useMembership } from '@/lib/membershipContext';
import { useLivePosts } from '@/lib/useLivePosts';
import { ContentCalendar } from '@/features/calendar/ContentCalendar';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { Button } from '@/components/ui/button';

export default function CalendarPage() {
  const { activeClient, clients, loading: clientsLoading } = useClient();
  const { isManager } = useMembership();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', activeClient?.id],
    queryFn: () => listPosts(),
    enabled: !!activeClient,
    refetchInterval: 30000,
  });

  useLivePosts(activeClient?.id, { enabled: !!activeClient, showStatusToasts: true });

  if (!clientsLoading && clients.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyHiveState
          title={isManager ? 'No clients assigned yet' : 'No clients yet'}
          description={
            isManager
              ? 'Ask your admin to assign you to a client so you can manage their calendar.'
              : 'Create a client to start scheduling posts.'
          }
        />
        {!isManager && (
          <div className="flex justify-center">
            <Button asChild>
              <Link to="/app/clients">Go to Clients</Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Schedule</p>
          <h2 className="font-display text-2xl font-bold">Content Calendar</h2>
          <p className="text-muted-foreground">Plan and schedule your social posts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/app/posts/import">Import CSV</Link>
          </Button>
          <Button asChild>
            <Link to="/app/posts/new">New Post</Link>
          </Button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading calendar…</p>
      ) : (
        <ContentCalendar posts={posts} />
      )}
    </div>
  );
}
