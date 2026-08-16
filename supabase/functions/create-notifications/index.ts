import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';
import { createInAppNotifications } from '../_shared/workflowNotify.ts';

type NotificationInput = {
  userId: string;
  type: string;
  event: string;
  title: string;
  body?: string;
  href?: string;
  metadata?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const notifications = (body.notifications || []) as NotificationInput[];
    if (!notifications.length) {
      return jsonResponse({ created: 0 });
    }

    const service = getServiceClient();
    await createInAppNotifications(
      service,
      notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        event: n.event,
        title: n.title,
        body: n.body || null,
        href: n.href || null,
        metadata: n.metadata || {},
      })),
    );

    return jsonResponse({ created: notifications.length });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Unauthorized' || message === 'Missing authorization' ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});
