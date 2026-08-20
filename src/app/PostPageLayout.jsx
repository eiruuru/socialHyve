import { Suspense } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { isPostEditRoute } from '@/features/posts/postNavUtils';
import { lazyWithRetry } from './lazyWithRetry';

const EditPostPage = lazyWithRetry(() => import('@/pages/EditPostPage'));
const PostDetailPage = lazyWithRetry(() => import('@/pages/PostDetailPage'));

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
