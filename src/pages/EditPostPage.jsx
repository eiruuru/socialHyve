import { useNavigate, useParams } from 'react-router-dom';
import { DocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { PostComposer } from '@/features/posts/PostComposer';
import { PostNavigation } from '@/features/posts/PostNavigation';
import { usePostNavigation } from '@/features/posts/usePostNavigation';
import { Button } from '@/components/ui/button';

export default function EditPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const postNav = usePostNavigation(id, { mode: 'edit' });

  return (
    <div className="space-y-6">
      <DocumentMeta title="Edit post" description={PAGE_DESCRIPTIONS.editPost} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => navigate(`/app/posts/${id}${postNav.navSearch}`)}
          >
            ← Back to post
          </Button>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Edit</p>
          <h2 className="font-display text-2xl font-bold">Edit Post</h2>
          <p className="text-muted-foreground">Update content, media, and schedule</p>
        </div>
        <PostNavigation
          prevHref={postNav.prevHref}
          nextHref={postNav.nextHref}
          position={postNav.position}
          total={postNav.total}
          className="flex items-center gap-1 pt-1"
        />
      </div>
      <PostComposer key={id} editPostId={id} />
    </div>
  );
}
