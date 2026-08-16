import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { showToast } from './toast';

export function useLivePosts(clientId, { enabled = true, showStatusToasts = false } = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !clientId) return undefined;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['posts', clientId] });
    };

    const channel = supabase
      .channel(`posts-live-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          invalidate();
          if (!showStatusToasts) return;
          const next = payload.new;
          const prev = payload.old;
          if (!next?.id || !prev?.status) return;
          if (prev.status === next.status) return;
          if (next.status === 'published') {
            showToast({ title: 'Post published', variant: 'success' });
          } else if (next.status === 'failed') {
            showToast({
              title: 'Publish failed',
              description: next.error_message || 'Check post details',
              variant: 'error',
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, enabled, queryClient, showStatusToasts]);
}

export function useFocusedPostPolling(postId, { enabled = true, intervalMs = 15000 } = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !postId) return undefined;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['post-activity', postId] });
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [postId, enabled, intervalMs, queryClient]);
}
