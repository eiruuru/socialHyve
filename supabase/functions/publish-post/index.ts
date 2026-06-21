import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, META_GRAPH } from '../_shared/supabase.ts';

const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));
    const service = getServiceClient();

    if (body.mode === 'queue') {
      const now = new Date().toISOString();
      const { data: duePosts } = await service
        .from('posts')
        .select('id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now);

      const results = [];
      for (const post of duePosts || []) {
        results.push(await publishPost(service, post.id));
      }

      const { data: jobs } = await service
        .from('publish_jobs')
        .select('post_id')
        .lte('next_run_at', now)
        .lt('attempts', 3);

      for (const job of jobs || []) {
        results.push(await publishPost(service, job.post_id));
      }

      return jsonResponse({ processed: results.length, results });
    }

    if (body.postId) {
      const result = await publishPost(service, body.postId);
      return jsonResponse(result);
    }

    return jsonResponse({ error: 'postId or mode=queue required' }, 400);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

async function publishPost(service: ReturnType<typeof getServiceClient>, postId: string) {
  const { data: post, error: postErr } = await service
    .from('posts')
    .select('*, post_media(*), post_targets(*)')
    .eq('id', postId)
    .single();

  if (postErr || !post) return { postId, error: 'Post not found' };

  await service.from('posts').update({ status: 'publishing' }).eq('id', postId);

  const { data: accounts } = await service
    .from('social_accounts')
    .select('*')
    .eq('workspace_id', post.workspace_id);

  const fbAccount = accounts?.find((a) => a.platform === 'facebook');
  const igAccount = accounts?.find((a) => a.platform === 'instagram');
  const media = post.post_media?.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order) || [];
  const primaryMedia = media[0];

  let hasError = false;
  const errors: string[] = [];

  if (post.publish_facebook && fbAccount) {
    try {
      const externalId = await publishToFacebook(fbAccount, post.caption, primaryMedia);
      await service.from('post_targets').upsert({
        post_id: postId,
        platform: 'facebook',
        status: 'published',
        external_post_id: externalId,
        error_message: null,
      }, { onConflict: 'post_id,platform' });
    } catch (err) {
      hasError = true;
      const msg = (err as Error).message;
      errors.push(`Facebook: ${msg}`);
      await service.from('post_targets').upsert({
        post_id: postId,
        platform: 'facebook',
        status: 'failed',
        error_message: msg,
      }, { onConflict: 'post_id,platform' });
    }
  } else if (post.publish_facebook) {
    await service.from('post_targets').upsert({
      post_id: postId,
      platform: 'facebook',
      status: 'skipped',
      error_message: 'No Facebook account connected',
    }, { onConflict: 'post_id,platform' });
  }

  if (post.publish_instagram && igAccount) {
    try {
      const externalId = await publishToInstagram(igAccount, post.caption, primaryMedia, post.scheduled_at);
      await service.from('post_targets').upsert({
        post_id: postId,
        platform: 'instagram',
        status: 'published',
        external_post_id: externalId,
        error_message: null,
      }, { onConflict: 'post_id,platform' });
    } catch (err) {
      hasError = true;
      const msg = (err as Error).message;
      errors.push(`Instagram: ${msg}`);
      await service.from('post_targets').upsert({
        post_id: postId,
        platform: 'instagram',
        status: 'failed',
        error_message: msg,
      }, { onConflict: 'post_id,platform' });
    }
  } else if (post.publish_instagram) {
    await service.from('post_targets').upsert({
      post_id: postId,
      platform: 'instagram',
      status: 'skipped',
      error_message: 'No Instagram account connected',
    }, { onConflict: 'post_id,platform' });
  }

  const finalStatus = hasError ? 'failed' : 'published';
  await service.from('posts').update({
    status: finalStatus,
    published_at: hasError ? null : new Date().toISOString(),
    error_message: errors.length ? errors.join('; ') : null,
  }).eq('id', postId);

  if (hasError) {
    const { data: existingJob } = await service
      .from('publish_jobs')
      .select('*')
      .eq('post_id', postId)
      .maybeSingle();

    const attempts = (existingJob?.attempts || 0) + 1;
    if (attempts < 3) {
      const nextRun = new Date(Date.now() + attempts * 5 * 60 * 1000).toISOString();
      await service.from('publish_jobs').upsert({
        post_id: postId,
        attempts,
        next_run_at: nextRun,
        last_error: errors.join('; '),
      }, { onConflict: 'post_id' });
      await service.from('posts').update({ status: 'scheduled' }).eq('id', postId);
    } else {
      await service.from('publish_jobs').delete().eq('post_id', postId);
    }
  } else {
    await service.from('publish_jobs').delete().eq('post_id', postId);
  }

  return { postId, status: finalStatus, errors };
}

async function publishToFacebook(
  account: Record<string, unknown>,
  caption: string,
  media?: Record<string, unknown> | null
): Promise<string> {
  const token = account.page_access_token || account.access_token;
  const pageId = account.page_id || account.external_id;

  if (media?.public_url) {
    const isVideo = (media.mime_type as string)?.startsWith('video/');
    const endpoint = isVideo ? `${META_GRAPH}/${pageId}/videos` : `${META_GRAPH}/${pageId}/photos`;
    const params = new URLSearchParams({
      access_token: token as string,
      caption,
      [isVideo ? 'file_url' : 'url']: media.public_url as string,
    });
    const res = await fetch(`${endpoint}?${params}`, { method: 'POST' });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.id || data.post_id;
  }

  const params = new URLSearchParams({
    access_token: token as string,
    message: caption,
  });
  const res = await fetch(`${META_GRAPH}/${pageId}/feed?${params}`, { method: 'POST' });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

async function publishToInstagram(
  account: Record<string, unknown>,
  caption: string,
  media?: Record<string, unknown> | null,
  scheduledAt?: string | null
): Promise<string> {
  const token = account.page_access_token || account.access_token;
  const igUserId = account.ig_user_id || account.external_id;

  if (!media?.public_url) throw new Error('Instagram requires media');

  const isVideo = (media.mime_type as string)?.startsWith('video/');
  const params: Record<string, string> = {
    access_token: token as string,
    caption,
    [isVideo ? 'video_url' : 'image_url']: media.public_url as string,
  };

  const scheduleTime = scheduledAt ? new Date(scheduledAt) : null;
  const now = new Date();
  const isFutureSchedule = scheduleTime && scheduleTime.getTime() > now.getTime() + 10 * 60 * 1000;

  if (isFutureSchedule && scheduleTime) {
    params.published = 'false';
    params.scheduled_publish_time = String(Math.floor(scheduleTime.getTime() / 1000));
  }

  const containerRes = await fetch(`${META_GRAPH}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const containerData = await containerRes.json();
  if (containerData.error) throw new Error(containerData.error.message);

  if (isFutureSchedule) {
    return containerData.id;
  }

  const publishRes = await fetch(`${META_GRAPH}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      access_token: token as string,
      creation_id: containerData.id,
    }),
  });
  const publishData = await publishRes.json();
  if (publishData.error) throw new Error(publishData.error.message);
  return publishData.id;
}

async function refreshMetaToken(currentToken: string): Promise<{ token: string; expiresIn: number }> {
  const url = new URL(`${META_GRAPH}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', META_APP_ID);
  url.searchParams.set('client_secret', META_APP_SECRET);
  url.searchParams.set('fb_exchange_token', currentToken);
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { token: data.access_token, expiresIn: data.expires_in || 5184000 };
}

export { refreshMetaToken };
