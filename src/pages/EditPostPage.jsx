import { Link, useParams } from 'react-router-dom';
import { PostComposer } from '@/features/posts/PostComposer';
import { Button } from '@/components/ui/button';

export default function EditPostPage() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to={`/app/posts/${id}`}>← Back to post</Link>
        </Button>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Edit</p>
        <h2 className="font-display text-2xl font-bold">Edit Post</h2>
        <p className="text-muted-foreground">Update content, media, and schedule</p>
      </div>
      <PostComposer editPostId={id} />
    </div>
  );
}
