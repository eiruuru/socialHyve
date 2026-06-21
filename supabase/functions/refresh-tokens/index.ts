import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { CANVA_API, getServiceClient, META_GRAPH } from '../_shared/supabase.ts';

const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '';
const CANVA_CLIENT_ID = Deno.env.get('CANVA_CLIENT_ID') || '';
const CANVA_CLIENT_SECRET = Deno.env.get('CANVA_CLIENT_SECRET') || '';

const REFRESH_WINDOW_DAYS = 14;

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const service = getServiceClient();
    const refreshBefore = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const metaResults = await refreshMetaAccounts(service, refreshBefore);
    const canvaResults = await refreshCanvaAccounts(service, refreshBefore);

    return jsonResponse({
      meta: metaResults,
      canva: canvaResults,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

async function refreshMetaAccounts(service: ReturnType<typeof getServiceClient>, refreshBefore: string) {
  const { data: accounts } = await service
    .from('social_accounts')
    .select('*')
    .or(`token_expires_at.is.null,token_expires_at.lte.${refreshBefore}`);

  const results = [];
  const seenTokens = new Set<string>();

  for (const account of accounts || []) {
    const token = account.access_token;
    if (seenTokens.has(token)) continue;
    seenTokens.add(token);

    try {
      const url = new URL(`${META_GRAPH}/oauth/access_token`);
      url.searchParams.set('grant_type', 'fb_exchange_token');
      url.searchParams.set('client_id', META_APP_ID);
      url.searchParams.set('client_secret', META_APP_SECRET);
      url.searchParams.set('fb_exchange_token', token);

      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();
      await service
        .from('social_accounts')
        .update({ access_token: data.access_token, page_access_token: data.access_token, token_expires_at: expiresAt })
        .eq('access_token', token);

      results.push({ token: token.slice(0, 8) + '...', status: 'refreshed', expiresAt });
    } catch (err) {
      results.push({ token: token.slice(0, 8) + '...', status: 'failed', error: (err as Error).message });
    }
  }

  return results;
}

async function refreshCanvaAccounts(service: ReturnType<typeof getServiceClient>, refreshBefore: string) {
  const { data: connections } = await service
    .from('canva_connections')
    .select('*')
    .lte('token_expires_at', refreshBefore);

  const results = [];

  for (const conn of connections || []) {
    try {
      const credentials = btoa(`${CANVA_CLIENT_ID}:${CANVA_CLIENT_SECRET}`);
      const res = await fetch(`${CANVA_API}/oauth/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: conn.refresh_token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || 'Refresh failed');

      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
      await service.from('canva_connections').update({
        access_token: data.access_token,
        refresh_token: data.refresh_token || conn.refresh_token,
        token_expires_at: expiresAt,
      }).eq('id', conn.id);

      results.push({ workspaceId: conn.workspace_id, status: 'refreshed', expiresAt });
    } catch (err) {
      results.push({ workspaceId: conn.workspace_id, status: 'failed', error: (err as Error).message });
    }
  }

  return results;
}
