import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Archive,
  Heart,
  MessageCircle,
  RefreshCw,
  Send,
  Smile,
} from 'lucide-react';
import { useDocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { useClient } from '@/lib/clientContext';
import { useMembership } from '@/lib/membershipContext';
import { listSocialAccounts } from '@/lib/metaAccounts';
import { listWorkspaceMetaSessions } from '@/lib/metaAccounts';
import { sessionsNeedInteractionsReconnect } from '@/lib/metaScopes';
import {
  interactionAction,
  listInteractionMessages,
  listInteractionThreads,
  replyToThread,
  syncInteractions,
} from '@/lib/interactions';
import { listOrganizationMembers, displayMember } from '@/lib/organization';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { AppPageHeader } from '@/components/AppPageHeader';
import { DEVICE_TIERS, useDeviceTier } from '@/lib/deviceTier';

const QUICK_EMOJIS = ['👍', '❤️', '😊', '🎉', '🙏', '✨'];

function describeSyncResult(result) {
  const synced = result?.synced ?? 0;
  const errors = result?.errors ?? [];
  if (errors.length) {
    const detail = errors.slice(0, 2).join(' · ');
    return {
      title: synced > 0 ? 'Inbox partially synced' : 'Sync completed with errors',
      description: `${synced} items synced. ${detail}`,
      variant: synced > 0 ? 'default' : 'error',
    };
  }
  return {
    title: 'Inbox synced',
    description: `${synced} items updated`,
    variant: 'default',
  };
}

function ThreadAvatar({ thread }) {
  if (thread.participant_avatar_url) {
    return (
      <img
        src={thread.participant_avatar_url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }

  const initial = (thread.participant_name || '?').charAt(0).toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-honey-light text-sm font-semibold text-honey-dark">
      {initial}
    </div>
  );
}

function formatThreadTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  if (now - date < 7 * 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  return format(date, 'MMM d');
}

export default function InteractionsPage() {
  useDocumentMeta({ title: 'Interactions', description: PAGE_DESCRIPTIONS.interactions });

  const { activeClient, clients, loading: clientsLoading } = useClient();
  const membership = useMembership();
  const tier = useDeviceTier();
  const stackInbox = tier === DEVICE_TIERS.TABLET;
  const queryClient = useQueryClient();
  const clientId = activeClient?.id;

  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [replyText, setReplyText] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['social-accounts', clientId],
    queryFn: () => listSocialAccounts({ clientId }),
    enabled: !!clientId,
  });

  const { data: metaSessions = [] } = useQuery({
    queryKey: ['workspace-meta-sessions'],
    queryFn: listWorkspaceMetaSessions,
    enabled: membership.isOwnerOrAdmin,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: listOrganizationMembers,
  });

  const threadFilters = useMemo(() => ({
    status: statusFilter,
    platform: platformFilter,
    channel: channelFilter,
    search,
  }), [statusFilter, platformFilter, channelFilter, search]);

  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ['interaction-threads', clientId, threadFilters],
    queryFn: () => listInteractionThreads(clientId, threadFilters),
    enabled: !!clientId,
    refetchInterval: 60000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['interaction-messages', selectedThreadId],
    queryFn: () => listInteractionMessages(selectedThreadId),
    enabled: !!selectedThreadId,
  });

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || null;
  const needsReconnect = sessionsNeedInteractionsReconnect(metaSessions);
  const hasAccounts = accounts.length > 0;

  useEffect(() => {
    if (!selectedThreadId && threads.length) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId]);

  useEffect(() => {
    if (!clientId || !hasAccounts) return;
    let cancelled = false;

    (async () => {
      setSyncing(true);
      try {
        const result = await syncInteractions(clientId);
        if (!cancelled) {
          await queryClient.invalidateQueries({ queryKey: ['interaction-threads', clientId] });
          const toast = describeSyncResult(result);
          if (toast.variant === 'error' || result?.errors?.length) {
            showToast(toast);
          }
        }
      } catch (err) {
        if (!cancelled) {
          showToast({
            title: 'Sync failed',
            description: err.message,
            variant: 'error',
          });
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [clientId, hasAccounts, queryClient]);

  const handleSync = async () => {
    if (!clientId) return;
    setSyncing(true);
    try {
      const result = await syncInteractions(clientId);
      await queryClient.invalidateQueries({ queryKey: ['interaction-threads', clientId] });
      if (selectedThreadId) {
        await queryClient.invalidateQueries({ queryKey: ['interaction-messages', selectedThreadId] });
      }
      showToast(describeSyncResult(result));
    } catch (err) {
      showToast({ title: 'Sync failed', description: err.message, variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectThread = async (thread) => {
    setSelectedThreadId(thread.id);
    if (thread.is_unread) {
      try {
        await interactionAction(thread.id, 'mark_read');
        await queryClient.invalidateQueries({ queryKey: ['interaction-threads', clientId] });
      } catch {
        // non-blocking
      }
    }
  };

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!selectedThreadId || !text || sending) return;

    setSending(true);
    try {
      await replyToThread(selectedThreadId, text);
      setReplyText('');
      await queryClient.invalidateQueries({ queryKey: ['interaction-messages', selectedThreadId] });
      await queryClient.invalidateQueries({ queryKey: ['interaction-threads', clientId] });
    } catch (err) {
      showToast({ title: 'Could not send reply', description: err.message, variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleAction = async (action, extra = {}) => {
    if (!selectedThreadId) return;
    try {
      await interactionAction(selectedThreadId, action, extra);
      await queryClient.invalidateQueries({ queryKey: ['interaction-threads', clientId] });
      if (action === 'archive') setSelectedThreadId(null);
    } catch (err) {
      showToast({ title: 'Action failed', description: err.message, variant: 'error' });
    }
  };

  if (!clientsLoading && clients.length === 0) {
    return (
      <EmptyHiveState
        title="No clients yet"
        description="Add a client and assign social accounts to use Interactions."
      />
    );
  }

  if (!clientId) {
    return <EmptyHiveState title="Select a client" description="Pick a client in the sidebar to view their inbox." compact />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Inbox</p>
          <h1 className="font-display text-2xl font-bold">Interactions</h1>
          <p className="text-sm text-muted-foreground">
            Facebook and Instagram comments and DMs for {activeClient?.name}.
          </p>
        </div>
        <Button variant="outline" onClick={handleSync} disabled={syncing || !hasAccounts}>
          <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>

      {!hasAccounts && (
        <div className="rounded-hyve-md border border-neutral-200 bg-paper-alt p-4 text-sm">
          Assign Facebook or Instagram pages under{' '}
          <Link to="/app/settings/accounts" className="underline">Social Links</Link>{' '}
          to sync comments and DMs.
        </div>
      )}

      {needsReconnect && (
        <div className="rounded-hyve-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Reconnect Meta with updated permissions to enable comments and messaging.{' '}
          <Link to="/app/settings/account?tab=meta" className="underline">Open Meta Accounts</Link>
        </div>
      )}

      <div className="flex h-[calc(100dvh-14rem)] min-h-[520px] overflow-hidden rounded-hyve-lg border border-neutral-200 bg-white">
        {/* Filters + thread list */}
        <div
          className={cn(
            'flex w-full shrink-0 flex-col border-r border-neutral-200',
            stackInbox ? (selectedThreadId ? 'hidden' : 'max-w-none') : 'max-w-sm',
          )}
        >
          <div className="space-y-2 border-b border-neutral-200 p-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or preview…"
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="h-9 rounded-hyve-sm border border-input bg-background px-2 text-xs"
              >
                <option value="all">All platforms</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
              </select>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="h-9 rounded-hyve-sm border border-input bg-background px-2 text-xs"
              >
                <option value="all">All types</option>
                <option value="comment">Comments</option>
                <option value="dm">DMs</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-hyve-sm border border-input bg-background px-2 text-xs"
              >
                <option value="open">Open</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading threads…</p>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-40" />
                No interactions yet. Sync pulls the last 30 days of comments and DMs.
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => handleSelectThread(thread)}
                  className={cn(
                    'flex w-full gap-3 border-b border-neutral-100 px-3 py-3 text-left transition-colors hover:bg-paper-alt',
                    selectedThreadId === thread.id && 'bg-honey-light/20',
                  )}
                >
                  <ThreadAvatar thread={thread} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {thread.participant_name || 'Unknown'}
                      </span>
                      {thread.is_unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-honey" aria-label="Unread" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {thread.preview_text || 'No preview'}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <PlatformChip platform={thread.platform} iconOnly />
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {thread.channel === 'dm' ? 'DM' : 'Comment'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatThreadTime(thread.last_message_at)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread detail */}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            stackInbox && !selectedThreadId && 'hidden',
          )}
        >
          {!selectedThread ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a thread to view messages
            </div>
          ) : (
            <>
              {stackInbox && (
                <AppPageHeader
                  title={selectedThread.participant_name || 'Thread'}
                  backLabel="Back to inbox"
                  onBack={() => setSelectedThreadId(null)}
                />
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{selectedThread.participant_name}</h2>
                    <PlatformChip platform={selectedThread.platform} />
                    <Badge variant="secondary" className="capitalize">
                      {selectedThread.channel === 'dm' ? 'Direct message' : 'Comment'}
                    </Badge>
                  </div>
                  {selectedThread.participant_handle && (
                    <p className="text-xs text-muted-foreground">{selectedThread.participant_handle}</p>
                  )}
                  {selectedThread.post_id && (
                    <Link
                      to={`/app/posts/${selectedThread.post_id}`}
                      className="text-xs text-primary underline"
                    >
                      View post in socialHyve
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedThread.assigned_to || ''}
                    onChange={(e) => handleAction('assign', { assignedTo: e.target.value || null })}
                    className="h-9 rounded-hyve-sm border border-input bg-background px-2 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {displayMember(m)}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(selectedThread.is_unread ? 'mark_read' : 'mark_unread')}
                  >
                    {selectedThread.is_unread ? 'Mark read' : 'Mark unread'}
                  </Button>
                  {selectedThread.channel === 'comment' && selectedThread.platform === 'facebook' && (
                    <Button variant="outline" size="sm" onClick={() => handleAction('like')}>
                      <Heart className="mr-1 h-4 w-4" />
                      Like
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleAction('archive')}>
                    <Archive className="mr-1 h-4 w-4" />
                    Archive
                  </Button>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messagesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages in this thread yet.</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'max-w-[80%] rounded-hyve-md px-3 py-2 text-sm',
                        msg.direction === 'outbound'
                          ? 'ml-auto bg-honey text-white'
                          : 'bg-paper-alt text-ink',
                      )}
                    >
                      {msg.author_name && (
                        <p className="mb-0.5 text-[10px] font-medium opacity-70">{msg.author_name}</p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                      <p className="mt-1 text-[10px] opacity-60">
                        {format(new Date(msg.created_at), 'MMM d · h:mm a')}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-neutral-200 p-4">
                <div className="mb-2 flex flex-wrap gap-1">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="rounded-hyve-sm px-2 py-1 text-lg hover:bg-paper-alt"
                      onClick={() => setReplyText((prev) => `${prev}${emoji}`)}
                      aria-label={`Insert ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <Smile className="ml-1 h-5 w-5 self-center text-muted-foreground" />
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply…"
                    rows={3}
                    className="min-h-[72px] flex-1 rounded-hyve-sm border border-input bg-background px-3 py-2 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                  <Button onClick={handleSendReply} disabled={!replyText.trim() || sending}>
                    <Send className="mr-2 h-4 w-4" />
                    Reply
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
