import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:invites@hyvehq.xyz';

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;

  try {
    const { default: webpush } = await import('https://esm.sh/web-push@3.6.7');
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
    );
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));

    if (body.action === 'send') {
      const userId = body.userId as string;
      const title = body.title as string;
      const message = body.body as string;
      const href = body.href as string;
      if (!userId || !title) return jsonResponse({ error: 'userId and title required' }, 400);

      const service = getServiceClient();
      const { data: subs } = await service
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      const payload = JSON.stringify({ title, body: message, href: href || '/app/calendar' });
      let sent = 0;
      for (const sub of subs || []) {
        if (await sendWebPush(sub, payload)) sent += 1;
      }
      return jsonResponse({ sent });
    }

    const { user } = await requireUser(req);
    const action = body.action as string;

    if (action === 'subscribe') {
      const { endpoint, p256dh, auth } = body;
      if (!endpoint || !p256dh || !auth) {
        return jsonResponse({ error: 'endpoint, p256dh, auth required' }, 400);
      }
      const service = getServiceClient();
      await service.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
      }, { onConflict: 'user_id,endpoint' });
      return jsonResponse({ ok: true });
    }

    if (action === 'unsubscribe') {
      const { endpoint } = body;
      const service = getServiceClient();
      await service.from('push_subscriptions').delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Unauthorized' || message === 'Missing authorization' ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});
