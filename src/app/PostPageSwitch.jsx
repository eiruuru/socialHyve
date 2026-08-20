import { Suspense } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { isPostEditPath } from '@/features/posts/postNavUtils';
import { lazyWithRetry } from '@/app/lazyWithRetry';

const EditPostPage = lazyWithRetry(() => import('@/pages/EditPostPage'));
const PostDetailPage = lazyWithRetry(() => import('@/pages/PostDetailPage'));

/** One post route; pick detail vs edit from the URL pathname. */
export function PostPageSwitch() {
  const { id } = useParams();
  const { pathname } = useLocation();
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
