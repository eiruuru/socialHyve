import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { readToken } from './accountTokens.ts';
import { META_GRAPH } from './supabase.ts';

export type AssignedAccount = Record<string, unknown> & {
  id: string;
  platform: string;
  page_id?: string | null;
  external_id?: string | null;
  ig_user_id?: string | null;
  is_primary?: boolean;
};

export async function loadClientAssignedAccounts(
  service: SupabaseClient,
  clientId: string,
): Promise<AssignedAccount[]> {
  const { data: rows, error } = await service
    .from('client_social_account_assignments')
    .select('is_primary, social_accounts(*)')
    .eq('client_id', clientId);

  if (error) throw error;

  return (rows || []).map((row) => ({
    ...(row.social_accounts as Record<string, unknown>),
    is_primary: row.is_primary,
  })) as AssignedAccount[];
}

export async function getPageToken(account: AssignedAccount): Promise<string | null> {
  return readToken((account.page_access_token || account.access_token) as string);
}

export async function graphGet(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  return res.json();
}

export async function fetchAllPages(initialUrl: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let url: string | null = initialUrl;

  while (url) {
    const data = await graphGet(url);
    if (data.error) {
      throw new Error((data.error as { message?: string }).message || 'Meta API error');
    }
    rows.push(...((data.data as Record<string, unknown>[]) || []));
    url = (data.paging as { next?: string })?.next || null;
  }

  return rows;
}

export async function loadPostIdByExternalId(
  service: SupabaseClient,
  clientId: string,
  externalPostId: string,
): Promise<string | null> {
  const { data } = await service
    .from('post_targets')
    .select('post_id, posts!inner(client_id)')
    .eq('external_post_id', externalPostId)
    .eq('posts.client_id', clientId)
    .maybeSingle();

  return (data?.post_id as string) || null;
}

type UpsertThreadInput = {
  clientId: string;
  accountId: string;
  platform: 'facebook' | 'instagram';
  channel: 'comment' | 'dm';
  externalThreadId: string;
  externalObjectId?: string | null;
  participantName?: string | null;
  participantHandle?: string | null;
  participantAvatarUrl?: string | null;
  previewText?: string | null;
  lastMessageAt?: string | null;
  postId?: string | null;
};

export async function upsertThread(
  service: SupabaseClient,
  input: UpsertThreadInput,
): Promise<string> {
  const { data, error } = await service
    .from('interaction_threads')
    .upsert({
      client_id: input.clientId,
      social_account_id: input.accountId,
      platform: input.platform,
      channel: input.channel,
      external_thread_id: input.externalThreadId,
      external_object_id: input.externalObjectId || null,
      participant_name: input.participantName || null,
      participant_handle: input.participantHandle || null,
      participant_avatar_url: input.participantAvatarUrl || null,
      preview_text: input.previewText || null,
      last_message_at: input.lastMessageAt || null,
      post_id: input.postId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id,platform,channel,external_thread_id' })
    .select('id')
    .single();

  if (error || !data) throw error || new Error('Failed to upsert thread');
  return data.id as string;
}

export async function upsertMessage(
  service: SupabaseClient,
  threadId: string,
  input: {
    externalMessageId: string;
    direction: 'inbound' | 'outbound';
    body?: string | null;
    authorName?: string | null;
    createdAt: string;
    messageType?: string;
  },
): Promise<void> {
  const { error } = await service
    .from('interaction_messages')
    .upsert({
      thread_id: threadId,
      external_message_id: input.externalMessageId,
      direction: input.direction,
      body: input.body || null,
      author_name: input.authorName || null,
      created_at: input.createdAt,
      message_type: input.messageType || 'text',
    }, { onConflict: 'thread_id,external_message_id' });

  if (error) throw error;
}

export async function syncFacebookComments(
  service: SupabaseClient,
  clientId: string,
  account: AssignedAccount,
  token: string,
  sinceUnix: number,
): Promise<number> {
  const pageId = String(account.page_id || account.external_id || '');
  if (!pageId) return 0;

  const url =
    `${META_GRAPH}/${pageId}/feed?fields=id,message,created_time,comments.limit(25){id,message,from,created_time}` +
    `&since=${sinceUnix}&limit=25&access_token=${encodeURIComponent(token)}`;

  const posts = await fetchAllPages(url);
  let count = 0;

  for (const post of posts) {
    const postId = String(post.id || '');
    const comments = ((post.comments as { data?: Record<string, unknown>[] })?.data) || [];
    const linkedPostId = await loadPostIdByExternalId(service, clientId, postId);

    for (const comment of comments) {
      const commentId = String(comment.id || '');
      if (!commentId) continue;

      const from = comment.from as { name?: string; id?: string } | undefined;
      const createdAt = String(comment.created_time || new Date().toISOString());
      const body = String(comment.message || '');

      const threadId = await upsertThread(service, {
        clientId,
        accountId: account.id,
        platform: 'facebook',
        channel: 'comment',
        externalThreadId: commentId,
        externalObjectId: postId,
        participantName: from?.name || 'Facebook user',
        participantHandle: from?.id || null,
        previewText: body.slice(0, 280),
        lastMessageAt: createdAt,
        postId: linkedPostId,
      });

      await upsertMessage(service, threadId, {
        externalMessageId: commentId,
        direction: 'inbound',
        body,
        authorName: from?.name || null,
        createdAt,
      });
      count += 1;
    }
  }

  return count;
}

export async function syncInstagramComments(
  service: SupabaseClient,
  clientId: string,
  account: AssignedAccount,
  token: string,
  sinceIso: string,
): Promise<number> {
  const igUserId = String(account.ig_user_id || account.external_id || '');
  if (!igUserId) return 0;

  const mediaUrl =
    `${META_GRAPH}/${igUserId}/media?fields=id,caption,timestamp,comments.limit(25){id,text,username,timestamp}` +
    `&since=${encodeURIComponent(sinceIso)}&limit=25&access_token=${encodeURIComponent(token)}`;

  const mediaItems = await fetchAllPages(mediaUrl);
  let count = 0;

  for (const media of mediaItems) {
    const mediaId = String(media.id || '');
    const comments = ((media.comments as { data?: Record<string, unknown>[] })?.data) || [];
    const linkedPostId = await loadPostIdByExternalId(service, clientId, mediaId);

    for (const comment of comments) {
      const commentId = String(comment.id || '');
      if (!commentId) continue;

      const username = String(comment.username || 'instagram_user');
      const createdAt = String(comment.timestamp || new Date().toISOString());
      const body = String(comment.text || '');

      const threadId = await upsertThread(service, {
        clientId,
        accountId: account.id,
        platform: 'instagram',
        channel: 'comment',
        externalThreadId: commentId,
        externalObjectId: mediaId,
        participantName: username,
        participantHandle: `@${username}`,
        previewText: body.slice(0, 280),
        lastMessageAt: createdAt,
        postId: linkedPostId,
      });

      await upsertMessage(service, threadId, {
        externalMessageId: commentId,
        direction: 'inbound',
        body,
        authorName: username,
        createdAt,
      });
      count += 1;
    }
  }

  return count;
}

export async function syncPageConversations(
  service: SupabaseClient,
  clientId: string,
  account: AssignedAccount,
  token: string,
  platform: 'facebook' | 'instagram',
): Promise<number> {
  const pageId = String(account.page_id || account.external_id || '');
  if (!pageId) return 0;

  const graphPlatform = platform === 'instagram' ? 'instagram' : 'messenger';
  const url =
    `${META_GRAPH}/${pageId}/conversations?platform=${graphPlatform}` +
    `&fields=participants,updated_time,messages.limit(20){id,message,from,created_time}` +
    `&limit=25&access_token=${encodeURIComponent(token)}`;

  const conversations = await fetchAllPages(url);
  let count = 0;

  for (const convo of conversations) {
    const convoId = String(convo.id || '');
    if (!convoId) continue;

    const participants = ((convo.participants as { data?: Record<string, unknown>[] })?.data) || [];
    const other = participants.find((p) => String(p.id) !== pageId) || participants[0];
    const messages = ((convo.messages as { data?: Record<string, unknown>[] })?.data) || [];
    const sorted = [...messages].sort((a, b) =>
      String(a.created_time || '').localeCompare(String(b.created_time || ''))
    );
    const latest = sorted[sorted.length - 1];
    const preview = latest ? String(latest.message || '') : '';
    const lastAt = String(convo.updated_time || latest?.created_time || new Date().toISOString());

    const threadId = await upsertThread(service, {
      clientId,
      accountId: account.id,
      platform,
      channel: 'dm',
      externalThreadId: convoId,
      externalObjectId: convoId,
      participantName: String(other?.name || other?.username || 'Direct message'),
      participantHandle: other?.username ? `@${other.username}` : String(other?.id || ''),
      previewText: preview.slice(0, 280),
      lastMessageAt: lastAt,
    });

    for (const msg of sorted) {
      const msgId = String(msg.id || '');
      if (!msgId) continue;
      const from = msg.from as { name?: string; id?: string } | undefined;
      const direction = String(from?.id) === pageId ? 'outbound' : 'inbound';

      await upsertMessage(service, threadId, {
        externalMessageId: msgId,
        direction: direction as 'inbound' | 'outbound',
        body: String(msg.message || ''),
        authorName: from?.name || null,
        createdAt: String(msg.created_time || new Date().toISOString()),
      });
    }

    count += 1;
  }

  return count;
}

export async function markSyncState(
  service: SupabaseClient,
  clientId: string,
  accountId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await service.from('interaction_sync_state').upsert({
    client_id: clientId,
    social_account_id: accountId,
    last_synced_at: now,
    updated_at: now,
  }, { onConflict: 'client_id,social_account_id' });
}

export async function getThreadWithAccount(
  service: SupabaseClient,
  threadId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await service
    .from('interaction_threads')
    .select('*, social_accounts(*)')
    .eq('id', threadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
