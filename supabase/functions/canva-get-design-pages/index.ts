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
    const body = await req.json().catch(() => ({}));
    const designId = body.designId as string;
    const clientId = body.clientId as string | undefined;
    const page = Math.max(1, Number(body.page) || 1);

    if (!designId) return jsonResponse({ error: 'designId required' }, 400);

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

    const url = new URL(`${CANVA_API}/designs/${designId}/pages`);
    url.searchParams.set('offset', String(page));
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get design pages');

    const item = data.items?.[0];
    const pageNumber = item?.page_number ?? item?.index ?? page;

    return jsonResponse({
      page: pageNumber,
      thumbnailUrl: item?.thumbnail?.url || null,
      width: item?.thumbnail?.width ?? null,
      height: item?.thumbnail?.height ?? null,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
