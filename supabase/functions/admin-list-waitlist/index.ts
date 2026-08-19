import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { assertPlatformAdmin } from '../_shared/platformAdmin.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { user } = await requireUser(req);
    const service = getServiceClient();
    await assertPlatformAdmin(service, user.id);

    const body = await req.json().catch(() => ({}));
    const status = body.status as string | undefined;

    let query = service
      .from('waitlist_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return jsonResponse({ requests: data ?? [] });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Forbidden' ? 403
      : message === 'Unauthorized' || message === 'Missing authorization' ? 401
      : 400;
    return jsonResponse({ error: message }, status);
  }
});
