import { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { isPostEditPath, useBrowserPathname } from '@/features/posts/postRouteUtils';
import { lazyWithRetry } from '@/app/lazyWithRetry';

const EditPostPage = lazyWithRetry(() => import('@/pages/EditPostPage'));
const PostDetailPage = lazyWithRetry(() => import('@/pages/PostDetailPage'));

/** One post route; pick detail vs edit from window.location, not Outlet siblings. */
export function PostPageSwitch() {
  const { id } = useParams();
  const pathname = useBrowserPathname();
  const isEdit = isPostEditPath(pathname, id);

  return (
    <Suspense fallback={<EmptyHiveState title="Loading the hive…" compact />}>
      {isEdit ? (
        <EditPostPage key={`edit-${id}`} />
      ) : (
        <PostDetailPage key={`view-${id}`} />
      )}
    </Suspense>
  );
}
