import { PostComposer } from '@/features/posts/PostComposer';
import { DocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';

export default function PostComposerPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <DocumentMeta title="New post" description={PAGE_DESCRIPTIONS.newPost} />
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Create</p>
        <h2 className="font-display text-2xl font-bold">New Post</h2>
        <p className="text-muted-foreground">Create and schedule content for Facebook and Instagram</p>
      </div>
      <PostComposer />
    </div>
  );
}
