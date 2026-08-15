import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { listPostComments, addPostComment } from '@/lib/posts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function CommentBubble({ comment, isOwn }) {
  const initial = (comment.authorEmail || '?').slice(0, 2).toUpperCase();

  if (isOwn) {
    return (
      <div className="flex justify-end gap-2.5">
        <div className="max-w-[80%] rounded-[14px_14px_4px_14px] bg-honey-light px-3.5 py-2.5 text-sm">
          {comment.body}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-status-scheduled text-xs font-bold text-white">
          {initial}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-honey-dark text-xs font-bold text-white">
        {initial}
      </span>
      <div className="max-w-[80%] rounded-[14px_14px_14px_4px] bg-neutral-100 px-3.5 py-2.5 text-sm">
        {comment.body}
      </div>
    </div>
  );
}

export function CommentThread({ postId, readOnly = false }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: () => listPostComments(postId),
    enabled: !!postId,
  });

  const enriched = comments.map((c) => ({
    ...c,
    authorEmail: c.user_id === user?.id ? user.email : 'Reviewer',
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await addPostComment(postId, body.trim());
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading comments…</p>;
  }

  return (
    <div className="space-y-4">
      <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">
        Feedback
      </h4>
      {enriched.length === 0 ? (
        <p className="text-sm text-neutral-500">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {enriched.map((c) => (
            <CommentBubble key={c.id} comment={c} isOwn={c.user_id === user?.id} />
          ))}
        </div>
      )}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Add feedback…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
          <Button type="submit" size="sm" disabled={saving || !body.trim()}>
            {saving ? 'Sending…' : 'Add comment'}
          </Button>
        </form>
      )}
    </div>
  );
}
