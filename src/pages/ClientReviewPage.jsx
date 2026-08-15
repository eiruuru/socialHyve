import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listPosts, updateApprovalStatus, addPostComment } from '@/lib/posts';
import { PlatformPreviewTabs } from '@/features/posts/previews/PlatformPreviewTabs';
import { normalizeMediaList } from '@/features/posts/previews/mediaUtils';
import { PostStatusBadges } from '@/features/queue/postStatus';
import { CommentThread } from '@/features/queue/CommentThread';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      alert('Please add a comment explaining what needs to change.');
      return;
    }
    setSubmitting(true);
    try {
      if (comment.trim()) {
        await addPostComment(selected.id, comment.trim(), 'client');
      }
      await updateApprovalStatus(
        selected.id,
        action === 'approve' ? 'approved' : 'changes_requested'
      );
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['client-review', clientId] });
    } catch (err) {
      alert(err.message);
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
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => setSelectedId(post.id)}
                className={`w-full rounded-hyve-md border p-3 text-left text-sm transition-colors ${
                  selected?.id === post.id ? 'border-honey bg-honey-light/30' : 'hover:bg-neutral-50'
                }`}
              >
                <PostStatusBadges post={post} />
                <p className="mt-1 truncate font-medium">
                  {post.internal_name || post.caption?.slice(0, 40) || 'Untitled'}
                </p>
              </button>
            ))}
          </div>

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
        </div>
      )}
    </div>
  );
}
