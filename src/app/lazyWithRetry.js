import { lazy } from 'react';

const CHUNK_RELOAD_KEY = 'socialhyve_chunk_reload';

/** Retry lazy imports once after deploys by reloading when a stale chunk 404s. */
export function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch((error) => {
      const message = String(error?.message || error);
      const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed/i.test(message);

      if (isChunkError && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        return new Promise(() => {});
      }

      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      throw error;
    }),
  );
}
