import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPost, deletePost } from '@/lib/posts';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { FacebookPreview, InstagramPreview } from '@/features/posts/PlatformPreviews';
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

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;
  if (!post) return <p className="text-destructive">Post not found</p>;

  const primaryMedia = post.post_media?.[0];
  const mediaUrl = primaryMedia?.public_url;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Post Detail</h2>
            <Badge variant={post.status}>{post.status}</Badge>
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
        <div className="flex gap-2">
          {post.status === 'failed' && (
            <Button onClick={handleRetry}>Retry Publish</Button>
          )}
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          <Button variant="outline" asChild>
            <Link to="/app/calendar">Back to Calendar</Link>
          </Button>
        </div>
      </div>

      {post.error_message && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {post.error_message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap">{post.caption || '(no caption)'}</p>
            {mediaUrl && (
              <img src={mediaUrl} alt="" className="max-h-64 rounded object-cover" />
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">Platform Results</p>
              {(post.post_targets || []).map((target) => (
                <div key={target.id} className="flex items-center justify-between rounded border p-2 text-sm">
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

        <div className="space-y-4">
          {post.publish_facebook && (
            <FacebookPreview caption={post.caption} mediaUrl={mediaUrl} />
          )}
          {post.publish_instagram && (
            <InstagramPreview caption={post.caption} mediaUrl={mediaUrl} />
          )}
        </div>
      </div>
    </div>
  );
}
