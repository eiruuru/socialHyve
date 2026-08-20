import { compareAsc, endOfMonth, format, isValid, parse, startOfMonth } from 'date-fns';
import { flushSync } from 'react-dom';
import { filterQueuePosts } from '@/features/queue/postStatus';
import { prepareForRouteChange } from '@/lib/clearModalLocks';

import { DEVICE_TIERS } from '@/lib/deviceTier';

/** Day bucket for calendar cells and post navigation. */
export function getPostCalendarDate(post) {
  if (!post) return null;
  if (post.status === 'published') {
    return post.scheduled_at || post.published_at || post.created_at || null;
  }
  return post.scheduled_at || post.created_at || null;
}

export function parseCalendarMonthParam(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const parsed = parse(`${month}-01`, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
}

export function buildScheduleReturnPath({ scheduledAtUtc, nav, tab, month, tier } = {}) {
  if (nav === 'queue' || tier === DEVICE_TIERS.MOBILE) {
    return `/app/queue${buildPostNavSearch({ nav: 'queue', tab })}`;
  }
  const scheduledMonth = scheduledAtUtc
    ? format(new Date(scheduledAtUtc), 'yyyy-MM')
    : month;
  return `/app/calendar${buildPostNavSearch({ month: scheduledMonth })}`;
}

export function buildPostNavSearch({ nav, tab, month } = {}) {
  const params = new URLSearchParams();
  if (nav) params.set('nav', nav);
  if (tab) params.set('tab', tab);
  if (month) params.set('month', month);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function isPostEditRoute(pathname, postId) {
  if (!pathname || !postId) return false;
  const normalized = pathname.replace(/\/+$/, '');
  return normalized === `/app/posts/${postId}/edit`
    || normalized.startsWith(`/app/posts/${postId}/edit/`);
}

export function buildPostEditPath(postId, navSearch = '') {
  return `/app/posts/${postId}/edit${navSearch}`;
}

export function buildPostDetailPath(postId, navSearch = '') {
  return `/app/posts/${postId}${navSearch}`;
}

/** Duplicated drafts with no platforms often desync SPA routing after the duplicate toast flow. */
export function isIncompleteCopyPost(post) {
  if (!post) return false;
  const isCopy = typeof post.internal_name === 'string' && post.internal_name.startsWith('(copy)');
  const noPlatforms = post.publish_facebook === false && post.publish_instagram === false;
  return isCopy && noPlatforms;
}

export function navigateToPostEdit(navigate, postId, navSearch = '', { post } = {}) {
  prepareForRouteChange();
  const path = buildPostEditPath(postId, navSearch);
  if (isIncompleteCopyPost(post)) {
    window.location.assign(path);
    return;
  }
  flushSync(() => {
    navigate(path);
  });
}

export function navigateToPostDetail(navigate, postId, navSearch = '', { post } = {}) {
  prepareForRouteChange();
  const path = buildPostDetailPath(postId, navSearch);
  if (isIncompleteCopyPost(post)) {
    window.location.assign(path);
    return;
  }
  flushSync(() => {
    navigate(path);
  });
}

/** Always reload — used after duplicate success toast. */
export function openPostEdit(postId, navSearch = '') {
  prepareForRouteChange();
  window.location.assign(buildPostEditPath(postId, navSearch));
}

export function sortPostsForNavigation(posts) {
  return [...posts].sort((a, b) => {
    const da = getPostCalendarDate(a);
    const db = getPostCalendarDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return compareAsc(new Date(da), new Date(db));
  });
}

export function filterPostsForNavigation(posts, { nav, tab, month } = {}) {
  if (nav === 'queue' && tab) {
    return filterQueuePosts(posts, tab);
  }
  if (nav === 'calendar' && month) {
    const [y, m] = month.split('-').map(Number);
    const start = startOfMonth(new Date(y, m - 1));
    const end = endOfMonth(start);
    return posts.filter((p) => {
      const date = getPostCalendarDate(p);
      if (!date) return false;
      const d = new Date(date);
      return d >= start && d <= end;
    });
  }
  return posts;
}

export function getPostNavigation(posts, currentId, navParams = {}) {
  let filtered = sortPostsForNavigation(filterPostsForNavigation(posts, navParams));
  let index = filtered.findIndex((p) => p.id === currentId);

  if (index === -1 && navParams.nav) {
    filtered = sortPostsForNavigation(posts);
    index = filtered.findIndex((p) => p.id === currentId);
  }

  if (index === -1) {
    return { prev: null, next: null, index: -1, total: filtered.length };
  }

  return {
    prev: index > 0 ? filtered[index - 1] : null,
    next: index < filtered.length - 1 ? filtered[index + 1] : null,
    index,
    total: filtered.length,
  };
}
