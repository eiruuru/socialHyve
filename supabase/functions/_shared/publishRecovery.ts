import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isTokenConnectionError, shouldRequeueMissedPost } from './publishQueue.ts';

/**
 * Publish held jobs immediately, and put falsely published posts from the
 * last 7 days back on the queue. Platforms that already have an external id
 * are left alone by the publisher.
 */
export async function releaseHeldPublishJobs(
  service: SupabaseClient,
  workspaceId: string,
): Promise<{ held: number; requeued: number }> {
  const now = new Date().toISOString();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: jobs, error: jobsError } = await service
    .from('publish_jobs')
    .select('post_id, last_error, posts!inner(workspace_id)')
    .eq('posts.workspace_id', workspaceId);
  if (jobsError) throw jobsError;

  const heldIds = (jobs || [])
    .filter((job) => isTokenConnectionError(job.last_error as string | null))
    .map((job) => job.post_id as string);
  let held = 0;

  if (heldIds.length) {
    const { error: updateError } = await service
      .from('publish_jobs')
      .update({ next_run_at: now })
      .in('post_id', heldIds);
    if (updateError) throw updateError;
    held = heldIds.length;
  }

  const { data: recentPosts, error: recentError } = await service
    .from('posts')
    .select('id, status, scheduled_at, post_targets(status, error_message, external_post_id)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'published')
    .gte('scheduled_at', since);
  if (recentError) throw recentError;

  const missed = (recentPosts || []).filter((post) => shouldRequeueMissedPost(post));
  for (const post of missed) {
    const { error: statusError } = await service
      .from('posts')
      .update({
        status: 'scheduled',
        published_at: null,
        error_message: null,
      })
      .eq('id', post.id);
    if (statusError) throw statusError;

    const { error: jobError } = await service
      .from('publish_jobs')
      .upsert({
        post_id: post.id,
        attempts: 0,
        next_run_at: now,
        last_error: null,
      }, { onConflict: 'post_id' });
    if (jobError) throw jobError;
  }

  return { held, requeued: missed.length };
}
