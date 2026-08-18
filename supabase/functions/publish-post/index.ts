import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { verifyCronSecret } from '../_shared/cronAuth.ts';
import { readToken, writeToken } from '../_shared/accountTokens.ts';
import { notifyPublishFailed, notifyPublishSuccess } from '../_shared/workflowNotify.ts';
import { debugTokenInfo, isPageGrantedToUser, isValidPageTokenFor, resolvePageAccessToken } from '../_shared/metaPages.ts';
import { getServiceClient, META_GRAPH } from '../_shared/supabase.ts';

const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '';
const APP_ACCESS_TOKEN = `${META_APP_ID}|${META_APP_SECRET}`;

type MediaItem = {
  public_url?: string;
  mime_type?: string;
  sort_order?: number;
};

type PlatformOverrides = {
  facebook?: { caption?: string; scheduled_at?: string };
  instagram?: { caption?: string; scheduled_at?: string };
};

function resolvePlatformCaption(post: Record<string, unknown>, platform: 'facebook' | 'instagram'): string {
  const overrides = (post.platform_overrides || {}) as PlatformOverrides;
  const override = overrides[platform]?.caption;
  if (override != null && String(override).trim() !== '') return String(override);
  return (post.caption as string) || '';
}

function resolvePlatformSchedule(
  post: Record<string, unknown>,
  platform: 'facebook' | 'instagram',
): string | null {
  const overrides = (post.platform_overrides || {}) as PlatformOverrides;
  return overrides[platform]?.scheduled_at ?? (post.scheduled_at as string | null) ?? null;
}

async function publishInstagramFirstComment(
  mediaId: string,
  comment: string,
  token: string,
): Promise<void> {
  const trimmed = comment.trim();
  if (!trimmed) return;

  const res = await fetch(`${META_GRAPH}/${mediaId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ access_token: token, message: trimmed }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));
    const service = getServiceClient();

    if (body.mode === 'queue') {
      if (!verifyCronSecret(req)) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
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

async function getMetaSessionUserToken(
  service: ReturnType<typeof getServiceClient>,
  metaSessionId: string,
): Promise<string | null> {
  const { data: session } = await service
    .from('workspace_meta_sessions')
    .select('user_access_token')
    .eq('id', metaSessionId)
    .maybeSingle();

  if (!session?.user_access_token) return null;
  return readToken(session.user_access_token as string);
}

async function loadClientAssignedAccounts(
  service: ReturnType<typeof getServiceClient>,
  clientId: string,
): Promise<Record<string, unknown>[]> {
  const { data: rows, error } = await service
    .from('client_social_account_assignments')
    .select('is_primary, social_account_id, social_accounts(*)')
    .eq('client_id', clientId);

  if (error) throw error;

  return (rows || []).map((row) => {
    const account = row.social_accounts as Record<string, unknown>;
    return {
      ...account,
      is_primary: row.is_primary,
    };
  });
}

async function ensurePageAccessToken(
  service: ReturnType<typeof getServiceClient>,
  account: Record<string, unknown>,
  options: { forceRefresh?: boolean } = {},
): Promise<string> {
  const pageId = String(account.page_id || account.external_id || '');
  const metaSessionId = String(account.meta_session_id || '');

  if (!pageId) {
    throw new Error('Missing Page credentials. Reconnect Meta in Account → Meta Accounts.');
  }

  const stored = await readToken((account.page_access_token || account.access_token) as string);
  if (!stored) {
    throw new Error('Missing Page credentials. Reconnect Meta in Account → Meta Accounts.');
  }

  const storedInfo = await debugTokenInfo(stored, APP_ACCESS_TOKEN);

  if (storedInfo.type === 'PAGE' && storedInfo.profileId && storedInfo.profileId !== pageId) {
    throw new Error(
      `Stored token belongs to a different Facebook Page (${storedInfo.profileId}). ` +
      'Reconnect Meta in Account → Meta Accounts.',
    );
  }

  if (!options.forceRefresh && isValidPageTokenFor(storedInfo, pageId)) {
    return stored;
  }

  if (storedInfo.type === 'USER') {
    throw new Error(
      'Page token is missing or outdated. Reconnect Meta in Account → Meta Accounts.',
    );
  }

  if (!metaSessionId) {
    throw new Error(
      'Facebook Page token expired. Reconnect Meta in Account → Meta Accounts.',
    );
  }

  const userToken = await getMetaSessionUserToken(service, metaSessionId);
  if (!userToken) {
    throw new Error(
      'Facebook Page token expired. Reconnect Meta in Account → Meta Accounts.',
    );
  }

  const pageGranted = await isPageGrantedToUser(userToken, pageId);
  if (!pageGranted) {
    throw new Error(
      `Facebook Page ${pageId} is not authorized for this Meta login. ` +
      'Reconnect that Facebook account in Account → Meta Accounts.',
    );
  }

  const pageToken = await resolvePageAccessToken(pageId, userToken, APP_ACCESS_TOKEN);
  const resolvedInfo = await debugTokenInfo(pageToken, APP_ACCESS_TOKEN);
  if (!isValidPageTokenFor(resolvedInfo, pageId)) {
    throw new Error(
      'Facebook returned an invalid Page token. Reconnect Meta in Account → Meta Accounts.',
    );
  }

  if (account.id) {
    const encrypted = await writeToken(pageToken);
    await service.from('social_accounts').update({
      access_token: encrypted,
      page_access_token: encrypted,
    }).eq('id', account.id);
  }
  return pageToken;
}

function isImpersonationError(message: string): boolean {
  return message.includes('impersonating a user\'s page')
    || message.includes('pages_show_list');
}

async function publishWithPageToken<T>(
  service: ReturnType<typeof getServiceClient>,
  account: Record<string, unknown>,
  publish: (token: string) => Promise<T>,
): Promise<{ result: T; pageToken: string }> {
  let pageToken = await ensurePageAccessToken(service, account);
  try {
    const result = await publish(pageToken);
    return { result, pageToken };
  } catch (err) {
    const message = (err as Error).message;
    if (!isImpersonationError(message)) throw err;
    pageToken = await ensurePageAccessToken(service, account, { forceRefresh: true });
    const result = await publish(pageToken);
    return { result, pageToken };
  }
}

function accountCandidates(
  accounts: Record<string, unknown>[],
  platform: string,
  preferredId?: string | null,
) {
  const rows = accounts.filter((a) => a.platform === platform);
  const ordered: Record<string, unknown>[] = [];
  const add = (row: Record<string, unknown> | null | undefined) => {
    if (!row || ordered.some((item) => item.id === row.id)) return;
    ordered.push(row);
  };

  add(rows.find((a) => a.id === preferredId));
  add(rows.find((a) => a.is_primary) || null);
  for (const row of rows) add(row);
  return ordered;
}

async function resolveWorkingAccount(
  service: ReturnType<typeof getServiceClient>,
  accounts: Record<string, unknown>[],
  platform: string,
  preferredId?: string | null,
): Promise<Record<string, unknown> | null> {
  for (const account of accountCandidates(accounts, platform, preferredId)) {
    try {
      await ensurePageAccessToken(service, account);
      return account;
    } catch {
      // Try the next connected account for this client.
    }
  }
  return null;
}

async function publishPost(service: ReturnType<typeof getServiceClient>, postId: string) {
  const { data: post, error: postErr } = await service
    .from('posts')
    .select('*, post_media(*), post_targets(*)')
    .eq('id', postId)
    .single();

  if (postErr || !post) return { postId, error: 'Post not found' };

  await service.from('posts').update({ status: 'publishing' }).eq('id', postId);

  const accountRows = post.client_id
    ? await loadClientAssignedAccounts(service, post.client_id as string)
    : [];

  const fbAccount = post.publish_facebook
    ? await resolveWorkingAccount(
      service,
      accountRows,
      'facebook',
      post.facebook_account_id,
    )
    : null;
  const igAccount = post.publish_instagram
    ? await resolveWorkingAccount(
      service,
      accountRows,
      'instagram',
      post.instagram_account_id,
    )
    : null;
  const media: MediaItem[] = (post.post_media || []).sort(
    (a: MediaItem, b: MediaItem) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const fbCaption = resolvePlatformCaption(post, 'facebook');
  const fbSchedule = resolvePlatformSchedule(post, 'facebook');
  const igCaption = resolvePlatformCaption(post, 'instagram');
  const igSchedule = resolvePlatformSchedule(post, 'instagram');
  const firstComment = (post.first_comment as string | undefined) || '';

  let hasError = false;
  const errors: string[] = [];

  if (post.publish_facebook && fbAccount) {
    try {
      const { result: externalId, pageToken } = await publishWithPageToken(
        service,
        fbAccount,
        (token) => {
          const fbWithToken = { ...fbAccount, page_access_token: token, access_token: token };
          return publishToFacebook(fbWithToken, fbCaption, media, fbSchedule);
        },
      );
      const permalink = await fetchMetaPermalink(externalId, pageToken);
      await service.from('post_targets').upsert({
        post_id: postId,
        platform: 'facebook',
        status: 'published',
        external_post_id: externalId,
        permalink,
        error_message: null,
        social_account_id: fbAccount.id,
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
        social_account_id: fbAccount?.id || null,
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
      const { result: externalId, pageToken } = await publishWithPageToken(
        service,
        igAccount,
        (token) => {
          const igWithToken = { ...igAccount, page_access_token: token, access_token: token };
          return publishToInstagram(igWithToken, igCaption, media, igSchedule);
        },
      );
      const permalink = await fetchMetaPermalink(externalId, pageToken);
      if (firstComment.trim() && !isFutureSchedule(igSchedule)) {
        try {
          await publishInstagramFirstComment(externalId, firstComment, pageToken);
        } catch (commentErr) {
          hasError = true;
          const msg = `Instagram comment: ${(commentErr as Error).message}`;
          errors.push(msg);
        }
      }
      await service.from('post_targets').upsert({
        post_id: postId,
        platform: 'instagram',
        status: 'published',
        external_post_id: externalId,
        permalink,
        error_message: null,
        social_account_id: igAccount.id,
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
        social_account_id: igAccount?.id || null,
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
  const publishedAt = hasError ? null : new Date().toISOString();
  const postUpdate: Record<string, unknown> = {
    status: finalStatus,
    published_at: publishedAt,
    error_message: errors.length ? errors.join('; ') : null,
  };
  // Keep calendar day in sync when publishing without a planned date (e.g. queue "Publish now").
  if (!hasError && !post.scheduled_at) {
    postUpdate.scheduled_at = publishedAt;
  }
  await service.from('posts').update(postUpdate).eq('id', postId);

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
      await notifyPublishFailed(service, post);
    }
  } else {
    await service.from('publish_jobs').delete().eq('post_id', postId);
    await notifyPublishSuccess(service, post);
  }

  return { postId, status: finalStatus, errors };
}

function isFutureSchedule(scheduledAt?: string | null): boolean {
  if (!scheduledAt) return false;
  const scheduleTime = new Date(scheduledAt);
  return scheduleTime.getTime() > Date.now() + 10 * 60 * 1000;
}

function isVideoMedia(media: MediaItem): boolean {
  return (media.mime_type || '').startsWith('video/');
}

async function fetchMetaPermalink(externalPostId: string, token: string): Promise<string | null> {
  try {
    const url = new URL(`${META_GRAPH}/${externalPostId}`);
    url.searchParams.set('fields', 'permalink,permalink_url');
    url.searchParams.set('access_token', token);
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) return null;
    return (data.permalink || data.permalink_url || null) as string | null;
  } catch {
    return null;
  }
}

async function publishToFacebook(
  account: Record<string, unknown>,
  caption: string,
  media: MediaItem[] = [],
  scheduledAt?: string | null
): Promise<string> {
  const token = account.page_access_token || account.access_token;
  const pageId = account.page_id || account.external_id;
  const futureSchedule = isFutureSchedule(scheduledAt);

  if (media.length === 0) {
    const params = new URLSearchParams({
      access_token: token as string,
      message: caption,
    });
    if (futureSchedule && scheduledAt) {
      params.set('published', 'false');
      params.set('scheduled_publish_time', String(Math.floor(new Date(scheduledAt).getTime() / 1000)));
    }
    const res = await fetch(`${META_GRAPH}/${pageId}/feed?${params}`, { method: 'POST' });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.id;
  }

  if (media.length === 1) {
    const item = media[0];
    if (!item.public_url) throw new Error('Media URL missing');

    const isVideo = isVideoMedia(item);
    const endpoint = isVideo ? `${META_GRAPH}/${pageId}/videos` : `${META_GRAPH}/${pageId}/photos`;
    const params = new URLSearchParams({
      access_token: token as string,
      [isVideo ? 'file_url' : 'url']: item.public_url,
    });
    if (caption) params.set(isVideo ? 'description' : 'caption', caption);
    if (futureSchedule && scheduledAt) {
      params.set('published', 'false');
      params.set('scheduled_publish_time', String(Math.floor(new Date(scheduledAt).getTime() / 1000)));
    }
    const res = await fetch(`${endpoint}?${params}`, { method: 'POST' });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.id || data.post_id;
  }

  const mediaFbids: string[] = [];
  for (const item of media) {
    if (!item.public_url) continue;
    const params = new URLSearchParams({
      access_token: token as string,
      url: item.public_url,
      published: 'false',
      temporary: 'true',
    });
    const res = await fetch(`${META_GRAPH}/${pageId}/photos?${params}`, { method: 'POST' });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    mediaFbids.push(data.id);
  }

  const feedParams = new URLSearchParams({
    access_token: token as string,
    message: caption || '',
    attached_media: JSON.stringify(mediaFbids.map((id) => ({ media_fbid: id }))),
  });
  if (futureSchedule && scheduledAt) {
    feedParams.set('published', 'false');
    feedParams.set('scheduled_publish_time', String(Math.floor(new Date(scheduledAt).getTime() / 1000)));
  }

  const feedRes = await fetch(`${META_GRAPH}/${pageId}/feed?${feedParams}`, { method: 'POST' });
  const feedData = await feedRes.json();
  if (feedData.error) throw new Error(feedData.error.message);
  return feedData.id;
}

async function publishToInstagram(
  account: Record<string, unknown>,
  caption: string,
  media: MediaItem[] = [],
  scheduledAt?: string | null
): Promise<string> {
  const token = account.page_access_token || account.access_token;
  const igUserId = account.ig_user_id || account.external_id;

  if (!media.length) throw new Error('Instagram requires media');

  const futureSchedule = isFutureSchedule(scheduledAt);

  if (media.length === 1) {
    const item = media[0];
    if (!item.public_url) throw new Error('Media URL missing');

    const isVideo = isVideoMedia(item);
    const params: Record<string, string> = {
      access_token: token as string,
      caption,
      [isVideo ? 'video_url' : 'image_url']: item.public_url,
    };
    if (isVideo) params.media_type = 'VIDEO';

    if (futureSchedule && scheduledAt) {
      params.published = 'false';
      params.scheduled_publish_time = String(Math.floor(new Date(scheduledAt).getTime() / 1000));
    }

    const containerRes = await fetch(`${META_GRAPH}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });
    const containerData = await containerRes.json();
    if (containerData.error) throw new Error(containerData.error.message);

    if (futureSchedule) return containerData.id;

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

  const childIds: string[] = [];
  for (const item of media) {
    if (!item.public_url) continue;
    const isVideo = isVideoMedia(item);
    const params: Record<string, string> = {
      access_token: token as string,
      is_carousel_item: 'true',
      [isVideo ? 'video_url' : 'image_url']: item.public_url,
    };
    if (isVideo) params.media_type = 'VIDEO';

    const res = await fetch(`${META_GRAPH}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    childIds.push(data.id);
  }

  const carouselParams: Record<string, string> = {
    access_token: token as string,
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
  };
  if (futureSchedule && scheduledAt) {
    carouselParams.published = 'false';
    carouselParams.scheduled_publish_time = String(Math.floor(new Date(scheduledAt).getTime() / 1000));
  }

  const carouselRes = await fetch(`${META_GRAPH}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(carouselParams),
  });
  const carouselData = await carouselRes.json();
  if (carouselData.error) throw new Error(carouselData.error.message);

  if (futureSchedule) return carouselData.id;

  const publishRes = await fetch(`${META_GRAPH}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      access_token: token as string,
      creation_id: carouselData.id,
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
