import { assertOrgHasProPlan } from '../_shared/billing.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  loadCachedCanvaDesigns,
  listCanvaDesignPage,
  saveCachedCanvaDesigns,
} from '../_shared/canvaDesigns.ts';
import {
  getCanvaConnection,
  getOrganizationForUser,
  getServiceClient,
  refreshCanvaToken,
  requireUser,
} from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { supabase, user } = await requireUser(req);
    const org = await getOrganizationForUser(supabase, user.id);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const clientId = body.clientId as string | undefined;
    const continuation = (body.continuation as string) || '';
    const fresh = Boolean(body.fresh);

    const service = getServiceClient();
    const clientCheck = clientId
      ? supabase.from('clients').select('id').eq('id', clientId).maybeSingle()
      : Promise.resolve({ data: { id: true }, error: null });

    const [{ data: client, error: clientErr }, , connection] = await Promise.all([
      clientCheck,
      assertOrgHasProPlan(service, org.id, 'Canva import'),
      getCanvaConnection(service, org.id, clientId),
    ]);

    if (clientId && (clientErr || !client)) {
      return jsonResponse({ error: 'Client not found or access denied' }, 403);
    }

    if (!connection) {
      return jsonResponse({ error: 'Canva not connected for this client' }, 400);
    }

    if (!continuation && !fresh) {
      const cached = await loadCachedCanvaDesigns(service, org.id, clientId);
      if (cached.designs.length && cached.fresh) {
        return jsonResponse({ designs: cached.designs, continuation: null, cached: true });
      }
    }

    let accessToken = connection.access_token;
    if (new Date(connection.token_expires_at) <= new Date()) {
      accessToken = await refreshCanvaToken(service, connection);
    }

    const page = await listCanvaDesignPage(accessToken, continuation || null);
    await saveCachedCanvaDesigns(service, org.id, clientId, page.designs).catch(() => {});

    return jsonResponse({
      designs: page.designs,
      continuation: page.continuation,
      cached: false,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
