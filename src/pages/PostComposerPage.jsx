import { PostComposer } from '@/features/posts/PostComposer';

export default function PostComposerPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Create</p>
        <h2 className="font-display text-2xl font-bold">New Post</h2>
        <p className="text-muted-foreground">Create and schedule content for Facebook and Instagram</p>
      </div>
      <PostComposer />
    </div>
  );
}
