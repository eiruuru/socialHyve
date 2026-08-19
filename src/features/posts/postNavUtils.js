import { compareAsc, endOfMonth, format, isValid, parse, startOfMonth } from 'date-fns';
import { filterQueuePosts } from '@/features/queue/postStatus';

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
