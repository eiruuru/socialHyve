import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { listClients } from '@/lib/organization';
import {
  listWorkspaceEvents,
  WORKSPACE_ACTION_LABELS,
  WORKSPACE_ENTITY_LABELS,
} from '@/lib/workspaceEvents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { EmptyHiveState } from '@/components/EmptyHiveState';

const PAGE_SIZE = 50;

const ACTION_FILTER_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'created', label: 'Created' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'published', label: 'Published' },
  { value: 'publish_failed', label: 'Publish failed' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'member_added', label: 'Member added' },
  { value: 'invite_sent', label: 'Invite sent' },
  { value: 'client_deleted', label: 'Client deleted' },
];

function actorLabel(actor) {
  if (!actor) return 'System';
  return actor.full_name?.trim() || actor.email || 'Unknown user';
}

function actionVariant(action) {
  if (action === 'deleted' || action === 'client_deleted' || action === 'publish_failed') {
    return 'failed';
  }
  if (action === 'published' || action === 'member_added') return 'published';
  if (action === 'scheduled' || action === 'invite_sent') return 'scheduled';
  return 'draft';
}

export function ActivityLogPanel() {
  const [clientId, setClientId] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: listClients,
  });

  const filters = useMemo(() => ({
    clientId: clientId || undefined,
    action: action || undefined,
    search: search.trim() || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }), [clientId, action, search, page]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['workspace-events', filters],
    queryFn: () => listWorkspaceEvents(filters),
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  const resetPage = () => setPage(0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Track post deletions, publishes, invites, and other workspace actions — even after posts are removed.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search by label, client, or action type</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Search</label>
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              placeholder="Post or client name…"
              className="w-56"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Client</label>
            <select
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); resetPage(); }}
              className="h-10 rounded-hyve-sm border border-input bg-background px-3 text-sm"
            >
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Action</label>
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); resetPage(); }}
              className="h-10 rounded-hyve-sm border border-input bg-background px-3 text-sm"
            >
              {ACTION_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
          <CardDescription>
            {total === 0 ? 'No events yet' : `${total} event${total === 1 ? '' : 's'}`}
            {isFetching && !isLoading ? ' · Refreshing…' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          ) : events.length === 0 ? (
            <EmptyHiveState
              title="No activity recorded yet"
              description="Post deletes, publishes, and team changes will appear here."
              compact
            />
          ) : (
            <ul className="divide-y divide-neutral-200">
              {events.map((event) => {
                const actionLabel = WORKSPACE_ACTION_LABELS[event.action] || event.action;
                const entityLabel = WORKSPACE_ENTITY_LABELS[event.entity_type] || event.entity_type;
                const clientName = event.client_id ? clientMap[event.client_id] : null;
                const canLinkPost = event.entity_type === 'post' && event.entity_id && event.entityExists;

                return (
                  <li key={event.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant={actionVariant(event.action)} label={actionLabel} />
                        <span className="text-xs text-muted-foreground">{entityLabel}</span>
                        {event.entity_type === 'post' && event.entity_id && !event.entityExists && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Post deleted
                          </span>
                        )}
                      </div>
                      <p className="font-medium">
                        {canLinkPost ? (
                          <Link
                            to={`/app/posts/${event.entity_id}`}
                            className="hover:text-honey-dark hover:underline"
                          >
                            {event.entity_label || 'Untitled'}
                          </Link>
                        ) : (
                          event.entity_label || '—'
                        )}
                      </p>
                      {event.detail && (
                        <p className="text-sm text-muted-foreground">{event.detail}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {actorLabel(event.actor)}
                        {clientName ? ` · ${clientName}` : ''}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}

          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
