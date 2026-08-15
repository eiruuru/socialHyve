import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listPosts } from '@/lib/posts';
import { useClient } from '@/lib/clientContext';
import { buildPostNavSearch, getPostNavigation } from './postNavUtils';

export function usePostNavigation(postId, { mode = 'view' } = {}) {
  const [searchParams] = useSearchParams();
  const { activeClient } = useClient();

  const navParams = useMemo(() => ({
    nav: searchParams.get('nav') || undefined,
    tab: searchParams.get('tab') || undefined,
    month: searchParams.get('month') || undefined,
  }), [searchParams]);

  const navSearch = useMemo(() => buildPostNavSearch(navParams), [navParams]);

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', activeClient?.id],
    queryFn: () => listPosts(),
    enabled: !!activeClient,
  });

  const { prev, next, index, total } = useMemo(
    () => getPostNavigation(posts, postId, navParams),
    [posts, postId, navParams],
  );

  const pathSuffix = mode === 'edit' ? '/edit' : '';

  return {
    prev,
    next,
    position: index >= 0 ? index + 1 : null,
    total,
    navSearch,
    prevHref: prev ? `/app/posts/${prev.id}${pathSuffix}${navSearch}` : null,
    nextHref: next ? `/app/posts/${next.id}${pathSuffix}${navSearch}` : null,
  };
}
