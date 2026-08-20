import { useLocation, useParams } from 'react-router-dom';
import EditPostPage from '@/pages/EditPostPage';
import PostDetailPage from '@/pages/PostDetailPage';

/** One route handles post view + edit so navigation cannot desync sibling outlets. */
export function PostPageSwitch() {
  const { id } = useParams();
  const location = useLocation();
  const isEdit = location.pathname.endsWith('/edit');

  if (isEdit) {
    return <EditPostPage key={`edit-${id}`} />;
  }

  return <PostDetailPage key={`view-${id}`} />;
}
