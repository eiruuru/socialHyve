import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useClient } from '@/lib/clientContext';
import { useMembership } from '@/lib/membershipContext';
import { hasCreativesQaAccess, isCreativesQaRole } from '@/lib/clientRoles';
import { listPosts, updateApprovalStatus, addPostComment } from '@/lib/posts';
import { notifyWorkflowEvent, getPostAuthorUserIds } from '@/lib/profile';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { useLivePosts } from '@/lib/useLivePosts';
import { showToast } from '@/lib/toast';
import { PostQueueCard } from '@/features/queue/PostQueueCard';
import { QueueViewToggle } from '@/features/queue/QueueViewToggle';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { filterQueuePosts, canTransitionApproval } from '@/features/queue/postStatus';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { buildPostNavSearch } from '@/features/posts/postNavUtils';

const QUEUE_VIEW_KEY = 'socialhyve_queue_view';

const TABS = [
  { id: 'review', label: 'Needs review' },
  { id: 'approved', label: 'Approved' },
  { id: 'active', label: 'All active' },
];

const EMPTY_COPY = {
  review: {
    title: 'The hive is empty — nothing waiting on you.',
    description: 'When posts are submitted for review, they show up here.',
  },
  approved: {
    title: 'No approved posts ready to schedule.',
    description: 'Approve posts from the review tab to see them here.',
  },
  active: {
    title: 'The hive is empty',
    description: 'Draft your first post to get started.',
  },
};

function QueueLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="font-medium text-ink">Schedule urgency:</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-red-600" /> Less than 2 days
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-amber-500" /> Less than 5 days
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-emerald-600" /> 5+ days
      </span>
    </div>
  );
}

export default function QueuePage() {
  const { user } = useAuth();
  const { activeClient } = useClient();
  const membership = useMembership();
  const allowManageActions = !hasCreativesQaAccess(membership);
  const resolvedClientId = activeClient?.id
    ?? membership.clientMemberships.find((cm) => isCreativesQaRole(cm.role))?.clientId
    ?? membership.clientMemberships[0]?.clientId;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('review');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem(QUEUE_VIEW_KEY);
    return saved === 'grid' ? 'grid' : 'list';
  });

  useLivePosts(resolvedClientId, { enabled: !!resolvedClientId, showStatusToasts: true });

  useEffect(() => {
    localStorage.setItem(QUEUE_VIEW_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    setSelectedIds([]);
  }, [tab, resolvedClientId]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', resolvedClientId],
    queryFn: () => listPosts({ clientId: resolvedClientId }),
    enabled: !!resolvedClientId,
    refetchInterval: 30000,
  });

  const filtered = useMemo(() => {
    let items = filterQueuePosts(posts, tab);
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((post) =>
      (post.caption || '').toLowerCase().includes(q)
      || (post.internal_name || '').toLowerCase().includes(q)
      || (post.label || '').toLowerCase().includes(q),
    );
  }, [posts, tab, search]);

  const empty = EMPTY_COPY[tab];
  const navSearch = buildPostNavSearch({ nav: 'queue', tab });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const toggleSelected = (postId) => {
    setSelectedIds((current) =>
      current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId],
    );
  };

  const handleApprove = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || !canTransitionApproval(post.approval_status || 'draft', 'approved')) {
      showToast({ title: 'Cannot approve this post', variant: 'error' });
      return;
    }
    await updateApprovalStatus(postId, 'approved');
    invalidate();
    showToast({ title: 'Post approved', variant: 'success' });
    notifyWorkflowEvent({
      event: 'approved',
      postId,
      recipientUserIds: getPostAuthorUserIds(post),
    }).catch(() => {});
  };

  const handleBulkApprove = async () => {
    const eligible = selectedIds.filter((postId) => {
      const post = posts.find((p) => p.id === postId);
      return post && canTransitionApproval(post.approval_status || 'draft', 'approved');
    });
    if (!eligible.length) {
      showToast({ title: 'No selected posts can be approved', variant: 'error' });
      return;
    }
    await Promise.all(eligible.map((postId) => updateApprovalStatus(postId, 'approved')));
    invalidate();
    setSelectedIds([]);
    showToast({ title: `${eligible.length} post${eligible.length === 1 ? '' : 's'} approved`, variant: 'success' });
  };

  const handleRequestChanges = async (postId, note) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || !canTransitionApproval(post.approval_status || 'draft', 'changes_requested')) {
      showToast({ title: 'Cannot request changes on this post', variant: 'error' });
      return;
    }
    await addPostComment(postId, note);
    await updateApprovalStatus(postId, 'changes_requested');
    invalidate();
    showToast({ title: 'Changes requested', description: 'Feedback sent to the author', variant: 'info' });
    notifyWorkflowEvent({
      event: 'changes_requested',
      postId,
      recipientUserIds: getPostAuthorUserIds(post),
    }).catch(() => {});
  };

  const handlePublish = async (postId) => {
    await invokeFunction('publishPost', { postId });
    invalidate();
    queryClient.invalidateQueries({ queryKey: ['post', postId] });
    showToast({ title: 'Publishing post…', variant: 'info' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Review</p>
          <h2 className="font-display text-2xl font-bold">Approval queue</h2>
          <p className="text-muted-foreground">Review and approve posts before they go live</p>
        </div>
        <QueueViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      <QueueLegend />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search caption, name, or label…"
          className="max-w-sm"
        />
        {selectedIds.length > 0 && tab === 'review' && (
          <Button size="sm" onClick={handleBulkApprove}>
            Approve selected ({selectedIds.length})
          </Button>
        )}
      </div>

      <TabsRoot value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.id} value={t.id}>
            {isLoading ? (
              <p className="text-muted-foreground">Loading queue…</p>
            ) : filtered.length === 0 ? (
              <EmptyHiveState title={empty.title} description={empty.description} />
            ) : (
              <div
                className={cn(
                  'rounded-hyve-lg bg-paper-alt p-5',
                  viewMode === 'grid'
                    ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
                    : 'space-y-3',
                )}
              >
                {filtered.map((post) => (
                  <PostQueueCard
                    key={post.id}
                    post={post}
                    variant={viewMode}
                    navSearch={navSearch}
                    authorEmail={user?.email}
                    selectable={tab === 'review' && viewMode === 'list'}
                    selected={selectedIds.includes(post.id)}
                    onSelectChange={() => toggleSelected(post.id)}
                    onApprove={handleApprove}
                    onRequestChanges={handleRequestChanges}
                    onPublish={allowManageActions ? handlePublish : undefined}
                    allowManageActions={allowManageActions}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </TabsRoot>
    </div>
  );
}
