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
    const action = body.action as string | undefined;
    if (!threadId || !action) {
      return jsonResponse({ error: 'threadId and action required' }, 400);
    }

    const service = getServiceClient();
    const thread = await getThreadWithAccount(service, threadId);
    if (!thread) return jsonResponse({ error: 'Thread not found' }, 404);

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (action === 'archive') {
      updates.status = 'archived';
    } else if (action === 'reopen') {
      updates.status = 'open';
    } else if (action === 'mark_read') {
      updates.is_unread = false;
    } else if (action === 'mark_unread') {
      updates.is_unread = true;
    } else if (action === 'assign') {
      updates.assigned_to = body.assignedTo || null;
    } else if (action === 'like') {
      if (thread.channel !== 'comment' || thread.platform !== 'facebook') {
        return jsonResponse({ error: 'Like is only supported on Facebook comments' }, 400);
      }

      const account = thread.social_accounts as Record<string, unknown> | null;
      const token = account ? await getPageToken(account as { id: string; platform: string }) : null;
      if (!token) return jsonResponse({ error: 'Missing page token' }, 400);

      const res = await fetch(`${META_GRAPH}/${thread.external_thread_id}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ access_token: token }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
    } else if (action === 'hide') {
      if (thread.channel !== 'comment') {
        return jsonResponse({ error: 'Hide is only supported on comments' }, 400);
      }

      const account = thread.social_accounts as Record<string, unknown> | null;
      const token = account ? await getPageToken(account as { id: string; platform: string }) : null;
      if (!token) return jsonResponse({ error: 'Missing page token' }, 400);

      const res = await fetch(`${META_GRAPH}/${thread.external_thread_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ access_token: token, is_hidden: 'true' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
    } else {
      return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }

    if (Object.keys(updates).length > 1) {
      await service.from('interaction_threads').update(updates).eq('id', threadId);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
