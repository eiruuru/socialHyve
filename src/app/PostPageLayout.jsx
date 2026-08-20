import { Suspense, lazy } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { isPostEditRoute } from '@/features/posts/postNavUtils';

const EditPostPage = lazy(() => import('@/pages/EditPostPage'));
const PostDetailPage = lazy(() => import('@/pages/PostDetailPage'));

/** Pick detail vs edit from the URL — avoids Outlet desync when sibling routes fail to swap. */
export function PostPageLayout() {
  const { id } = useParams();
  const location = useLocation();
  const isEdit = isPostEditRoute(location.pathname, id);

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
