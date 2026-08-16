import { lazy } from 'react';

const CHUNK_RELOAD_KEY = 'socialhyve_chunk_reload';

function getSessionStorage() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

/** Retry lazy imports once after deploys by reloading when a stale chunk 404s. */
export function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch((error) => {
      const message = String(error?.message || error);
      const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed/i.test(message);
      const storage = getSessionStorage();

      if (isChunkError && storage && !storage.getItem(CHUNK_RELOAD_KEY)) {
        storage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        return new Promise(() => {});
      }

      storage?.removeItem(CHUNK_RELOAD_KEY);
      throw error;
    }),
  );
}

export function clearChunkReloadFlag() {
  getSessionStorage()?.removeItem(CHUNK_RELOAD_KEY);
}
