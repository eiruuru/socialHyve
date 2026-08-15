import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { listPosts, updateApprovalStatus, addPostComment } from '@/lib/posts';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { PostQueueCard } from '@/features/queue/PostQueueCard';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { filterQueuePosts } from '@/features/queue/postStatus';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { canTransitionApproval } from '@/features/queue/postStatus';

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

export default function QueuePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('review');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => listPosts(),
  });

  const filtered = filterQueuePosts(posts, tab);
  const empty = EMPTY_COPY[tab];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const handleApprove = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || !canTransitionApproval(post.approval_status || 'draft', 'approved')) {
      alert('Cannot approve this post.');
      return;
    }
    await updateApprovalStatus(postId, 'approved');
    invalidate();
  };

  const handleRequestChanges = async (postId, note) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || !canTransitionApproval(post.approval_status || 'draft', 'changes_requested')) {
      alert('Cannot request changes on this post.');
      return;
    }
    await addPostComment(postId, note);
    await updateApprovalStatus(postId, 'changes_requested');
    invalidate();
  };

  const handlePublish = async (postId) => {
    await invokeFunction('publishPost', { postId });
    invalidate();
    queryClient.invalidateQueries({ queryKey: ['post', postId] });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Review</p>
        <h2 className="font-display text-2xl font-bold">Approval queue</h2>
        <p className="text-muted-foreground">Review and approve posts before they go live</p>
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
              <div className="space-y-3 rounded-hyve-lg bg-paper-alt p-5">
                {filtered.map((post) => (
                  <PostQueueCard
                    key={post.id}
                    post={post}
                    authorEmail={user?.email}
                    onApprove={handleApprove}
                    onRequestChanges={handleRequestChanges}
                    onPublish={handlePublish}
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
