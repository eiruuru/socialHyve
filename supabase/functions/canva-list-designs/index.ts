import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  CANVA_API,
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
    const continuation = body.continuation || '';

    if (clientId) {
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .maybeSingle();
      if (clientErr || !client) {
        return jsonResponse({ error: 'Client not found or access denied' }, 403);
      }
    }

    const service = getServiceClient();
    const connection = await getCanvaConnection(service, org.id, clientId);

    if (!connection) {
      return jsonResponse({ error: 'Canva not connected for this client' }, 400);
    }

    let accessToken = connection.access_token;
    if (new Date(connection.token_expires_at) <= new Date()) {
      accessToken = await refreshCanvaToken(service, connection);
    }

    const listUrl = new URL(`${CANVA_API}/designs`);
    if (continuation) listUrl.searchParams.set('continuation', continuation);

    const res = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list designs');

    const designs = (data.items || []).map((d: Record<string, unknown>) => ({
      id: d.id,
      title: d.title || 'Untitled',
      thumbnailUrl: d.thumbnail?.url || null,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    for (const design of designs) {
      const row = {
        workspace_id: org.id,
        client_id: clientId || null,
        canva_design_id: design.id,
        title: design.title,
        thumbnail_url: design.thumbnailUrl,
        last_synced_at: new Date().toISOString(),
      };
      await service.from('canva_designs').upsert(row, {
        onConflict: clientId ? 'client_id,canva_design_id' : 'workspace_id,canva_design_id',
      });
    }

    return jsonResponse({ designs, continuation: data.continuation || null });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
