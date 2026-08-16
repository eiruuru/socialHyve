import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listPosts, updateApprovalStatus, addPostComment } from '@/lib/posts';
import { notifyWorkflowEvent, getPostAuthorUserIds } from '@/lib/profile';
import { PlatformPreviewTabs } from '@/features/posts/previews/PlatformPreviewTabs';
import { normalizeMediaList } from '@/features/posts/previews/mediaUtils';
import { ReviewPostSelector } from '@/features/review/ReviewPostSelector';
import { CommentThread } from '@/features/queue/CommentThread';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/lib/toast';

export default function ClientReviewPage() {
  const { clientId } = useParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['client-review', clientId],
    queryFn: () =>
      listPosts({ clientId }).then((all) =>
        all.filter((p) => ['pending', 'changes_requested'].includes(p.approval_status))
      ),
    enabled: !!clientId,
  });

  const selected = posts.find((p) => p.id === selectedId) || posts[0];
  const mediaItems = normalizeMediaList(selected?.post_media || []);

  const handleAction = async (action) => {
    if (!selected) return;
    if (action === 'changes_requested' && !comment.trim()) {
      showToast({
        title: 'Comment required',
        description: 'Please explain what needs to change.',
        variant: 'error',
      });
      return;
    }
    setSubmitting(true);
    const currentIndex = posts.findIndex((p) => p.id === selected.id);
    try {
      if (comment.trim()) {
        await addPostComment(selected.id, comment.trim(), 'client');
      }
      await updateApprovalStatus(
        selected.id,
        action === 'approve' ? 'approved' : 'changes_requested'
      );
      notifyWorkflowEvent({
        event: action === 'approve' ? 'approved' : 'changes_requested',
        postId: selected.id,
        recipientUserIds: getPostAuthorUserIds(selected),
        postTitle: selected.internal_name || selected.caption?.slice(0, 80),
        href: `/app/posts/${selected.id}`,
      }).catch(() => {});
      setComment('');
      await queryClient.invalidateQueries({ queryKey: ['client-review', clientId] });
      const remaining = posts.filter((p) => p.id !== selected.id);
      if (remaining.length > 0) {
        const next = remaining[Math.min(currentIndex, remaining.length - 1)];
        setSelectedId(next.id);
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      showToast({ title: 'Action failed', description: err.message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground">Loading review queue…</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Client portal</p>
        <h2 className="font-display text-2xl font-bold">Review posts</h2>
        <p className="text-muted-foreground">Approve content or request edits</p>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nothing waiting for your review right now.
          </CardContent>
        </Card>
      ) : (
        <>
          <ReviewPostSelector
            posts={posts}
            selectedId={selected?.id}
            onSelect={setSelectedId}
          />

          {selected && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Your feedback</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Comment (required when requesting edits)…"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleAction('approve')} disabled={submitting}>
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAction('changes_requested')}
                        disabled={submitting}
                      >
                        Require edits
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <CommentThread postId={selected.id} teamView={false} readOnly />
                  </CardContent>
                </Card>
              </div>
              <div>
                <PlatformPreviewTabs
                  caption={selected.caption}
                  media={mediaItems}
                  scheduledAt={selected.scheduled_at}
                  publishFacebook={selected.publish_facebook}
                  publishInstagram={selected.publish_instagram}
                  clientId={clientId}
                  currentPostId={selected.id}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
