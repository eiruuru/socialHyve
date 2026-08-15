import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { PlatformPreviewTabs } from '@/features/posts/previews/PlatformPreviewTabs';
import { normalizeMediaList } from '@/features/posts/previews/mediaUtils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/brand/Logo';

async function fetchReviewPost(token) {
  return invokeFunction('reviewByToken', { token });
}

export default function ReviewLinkPage() {
  const { token } = useParams();
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['review-token', token],
    queryFn: () => fetchReviewPost(token),
    enabled: !!token && !done,
    retry: false,
  });

  const post = data?.post;
  const mediaItems = normalizeMediaList(post?.post_media || []);

  const handleSubmit = async (approvalAction) => {
    if (approvalAction === 'require_edits' && !comment.trim()) {
      alert('Please add a comment explaining what needs to change.');
      return;
    }
    setSubmitting(true);
    try {
      await invokeFunction('reviewByToken', {
        token,
        action: 'submit',
        approvalAction,
        comment: comment.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b bg-white px-6 py-4">
        <Logo />
      </header>
      <main className="mx-auto max-w-4xl p-8">
        {isLoading && <p className="text-muted-foreground">Loading review…</p>}
        {error && (
          <Card>
            <CardContent className="py-8 text-center text-destructive">
              This review link is invalid or has expired.
            </CardContent>
          </Card>
        )}
        {done && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="font-display text-xl font-semibold">Thank you!</p>
              <p className="mt-2 text-muted-foreground">Your feedback has been submitted.</p>
            </CardContent>
          </Card>
        )}
        {post && !done && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-bold">Review this post</h1>
              <p className="text-muted-foreground">Approve or request changes — no account required</p>
            </div>
            <PlatformPreviewTabs
              caption={post.caption}
              media={mediaItems}
              scheduledAt={post.scheduled_at}
              publishFacebook={post.publish_facebook}
              publishInstagram={post.publish_instagram}
              clientId={post.client_id}
              currentPostId={post.id}
            />
            <Card>
              <CardHeader>
                <CardTitle>Your decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Optional comment (required when requesting edits)…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleSubmit('approve')} disabled={submitting}>
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSubmit('require_edits')}
                    disabled={submitting}
                  >
                    Require edits
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
