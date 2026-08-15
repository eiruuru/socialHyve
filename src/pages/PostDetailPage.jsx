import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPost, deletePost, updateApprovalStatus } from '@/lib/posts';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { FacebookFeedPreview } from '@/features/posts/previews/FacebookFeedPreview';
import { InstagramFeedPreview } from '@/features/posts/previews/InstagramFeedPreview';
import { normalizeMediaList, isVideo } from '@/features/posts/previews/mediaUtils';
import { PostStatusBadges, canTransitionApproval } from '@/features/queue/postStatus';
import { CommentThread } from '@/features/queue/CommentThread';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPost(id),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!post) return <p className="text-destructive">Post not found</p>;

  const mediaItems = normalizeMediaList(post.post_media || []);
  const approval = post.approval_status || 'draft';

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    await deletePost(id);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    navigate('/app/calendar');
  };

  const handleRetry = async () => {
    await invokeFunction('publishPost', { postId: id });
    queryClient.invalidateQueries({ queryKey: ['post', id] });
  };

  const handleApprove = async () => {
    if (!canTransitionApproval(approval, 'approved')) return;
    await updateApprovalStatus(id, 'approved');
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const handleResubmit = async () => {
    if (!canTransitionApproval(approval, 'pending')) return;
    await updateApprovalStatus(id, 'pending');
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    navigate('/app/queue');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Post</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-bold">Post Detail</h2>
            <PostStatusBadges post={post} />
          </div>
          {post.scheduled_at && (
            <p className="text-muted-foreground">
              Scheduled: {new Date(post.scheduled_at).toLocaleString()}
            </p>
          )}
          {post.published_at && (
            <p className="text-muted-foreground">
              Published: {new Date(post.published_at).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {approval === 'pending' && (
            <Button onClick={handleApprove}>Approve</Button>
          )}
          {approval === 'changes_requested' && (
            <Button onClick={handleResubmit}>Resubmit for review</Button>
          )}
          {post.status === 'failed' && (
            <Button onClick={handleRetry}>Try again</Button>
          )}
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          <Button variant="outline" asChild>
            <Link to="/app/calendar">Back to Calendar</Link>
          </Button>
        </div>
      </div>

      {post.error_message && (
        <div className="rounded-hyve-md bg-[#FCE4E3] p-4 text-sm text-[#A62E2B]">
          That post didn&apos;t make it out — {post.error_message}
        </div>
      )}

      {approval === 'changes_requested' && (
        <div className="rounded-hyve-md border border-status-changes bg-[#FCEBEA] p-4 text-sm text-[#A62E2B]">
          Changes were requested. Review the feedback below, update your post, then resubmit.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap">{post.caption || '(no caption)'}</p>
              {mediaItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mediaItems.map((item, i) => (
                    isVideo(item.mime_type) ? (
                      <video key={i} src={item.public_url} className="h-20 w-20 rounded object-cover" muted />
                    ) : (
                      <img key={i} src={item.public_url} alt="" className="h-20 w-20 rounded object-cover" />
                    )
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">Platform Results</p>
                {(post.post_targets || []).map((target) => (
                  <div key={target.id} className="flex items-center justify-between rounded-hyve-sm border p-2 text-sm">
                    <span className="capitalize">{target.platform}</span>
                    <Badge variant={target.status}>{target.status}</Badge>
                    {target.error_message && (
                      <span className="text-xs text-red-600">{target.error_message}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <CommentThread postId={id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {post.publish_facebook && (
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-neutral-500">Facebook</p>
              <FacebookFeedPreview caption={post.caption} media={mediaItems} />
            </div>
          )}
          {post.publish_instagram && (
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-neutral-500">Instagram</p>
              <InstagramFeedPreview caption={post.caption} media={mediaItems} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
