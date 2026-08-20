import { useSyncExternalStore } from 'react';

function subscribeToPathname(onChange) {
  const notify = () => onChange();
  window.addEventListener('popstate', notify);
  window.addEventListener('hashchange', notify);
  const { pushState } = history;
  const { replaceState } = history;
  history.pushState = function patchedPushState(...args) {
    pushState.apply(this, args);
    notify();
  };
  history.replaceState = function patchedReplaceState(...args) {
    replaceState.apply(this, args);
    notify();
  };
  return () => {
    window.removeEventListener('popstate', notify);
    window.removeEventListener('hashchange', notify);
    history.pushState = pushState;
    history.replaceState = replaceState;
  };
}

function getPathnameSnapshot() {
  return window.location.pathname;
}

export function isPostEditPath(pathname, postId) {
  if (!postId) return false;
  const normalized = pathname.replace(/\/+$/, '');
  return normalized === `/app/posts/${postId}/edit`
    || normalized.startsWith(`/app/posts/${postId}/edit/`);
}

/** Read the real browser URL — React Router can desync under nested routes. */
export function useBrowserPathname() {
  return useSyncExternalStore(subscribeToPathname, getPathnameSnapshot, () => '');
}
