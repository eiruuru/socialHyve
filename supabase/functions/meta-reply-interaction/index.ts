import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, META_GRAPH, requireUser } from '../_shared/supabase.ts';
import { getPageToken, getThreadWithAccount } from '../_shared/metaInteractions.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));
    await requireUser(req);

    const threadId = body.threadId as string | undefined;
    const message = String(body.message || '').trim();
    if (!threadId || !message) {
      return jsonResponse({ error: 'threadId and message required' }, 400);
    }

    const service = getServiceClient();
    const thread = await getThreadWithAccount(service, threadId);
    if (!thread) return jsonResponse({ error: 'Thread not found' }, 404);

    const account = thread.social_accounts as Record<string, unknown> | null;
    if (!account) return jsonResponse({ error: 'Social account not found' }, 400);

    const token = await getPageToken(account as { id: string; platform: string });
    if (!token) return jsonResponse({ error: 'Missing page token' }, 400);

    const platform = String(thread.platform);
    const channel = String(thread.channel);
    const externalThreadId = String(thread.external_thread_id);
    let externalMessageId: string | null = null;

    if (channel === 'comment') {
      if (platform === 'facebook') {
        const res = await fetch(`${META_GRAPH}/${externalThreadId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ access_token: token, message }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        externalMessageId = String(data.id || '');
      } else {
        const res = await fetch(`${META_GRAPH}/${externalThreadId}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ access_token: token, message }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        externalMessageId = String(data.id || '');
      }
    } else {
      const res = await fetch(`${META_GRAPH}/${externalThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ access_token: token, message }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      externalMessageId = String(data.message_id || data.id || crypto.randomUUID());
    }

    const now = new Date().toISOString();
    await service.from('interaction_messages').insert({
      thread_id: threadId,
      external_message_id: externalMessageId || `local-${Date.now()}`,
      direction: 'outbound',
      body: message,
      author_name: 'You',
      created_at: now,
      message_type: 'text',
    });

    await service.from('interaction_threads').update({
      preview_text: message.slice(0, 280),
      last_message_at: now,
      is_unread: false,
      updated_at: now,
    }).eq('id', threadId);

    return jsonResponse({ ok: true, externalMessageId });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
