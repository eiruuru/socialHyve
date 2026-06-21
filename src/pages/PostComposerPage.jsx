import { PostComposer } from '@/features/posts/PostComposer';

export default function PostComposerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">New Post</h2>
        <p className="text-muted-foreground">Create and schedule content for Facebook and Instagram</p>
      </div>
      <PostComposer />
    </div>
  );
}
