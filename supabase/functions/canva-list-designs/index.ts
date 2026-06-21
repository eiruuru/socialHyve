import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { CANVA_API, getServiceClient, getWorkspaceForUser, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { supabase, user } = await requireUser(req);
    const workspace = await getWorkspaceForUser(supabase, user.id);

    const service = getServiceClient();
    const { data: connection, error: connErr } = await service
      .from('canva_connections')
      .select('*')
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (connErr || !connection) {
      return jsonResponse({ error: 'Canva not connected' }, 400);
    }

    let accessToken = connection.access_token;
    if (new Date(connection.token_expires_at) <= new Date()) {
      accessToken = await refreshCanvaToken(service, connection);
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const continuation = body.continuation || '';

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
      await service.from('canva_designs').upsert({
        workspace_id: workspace.id,
        canva_design_id: design.id,
        title: design.title,
        thumbnail_url: design.thumbnailUrl,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,canva_design_id' });
    }

    return jsonResponse({ designs, continuation: data.continuation || null });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});

async function refreshCanvaToken(service: ReturnType<typeof getServiceClient>, connection: Record<string, unknown>) {
  const clientId = Deno.env.get('CANVA_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET') || '';
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token as string,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Canva token refresh failed');

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await service.from('canva_connections').update({
    access_token: data.access_token,
    refresh_token: data.refresh_token || connection.refresh_token,
    token_expires_at: expiresAt,
  }).eq('id', connection.id);

  return data.access_token;
}
