import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { verifyCronSecret } from '../_shared/cronAuth.ts';
import { readToken, writeToken } from '../_shared/accountTokens.ts';
import { getServiceClient, META_GRAPH, refreshCanvaToken } from '../_shared/supabase.ts';

const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '';

const REFRESH_WINDOW_DAYS = 14;

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    if (!verifyCronSecret(req)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
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
    // Page access tokens must not be run through fb_exchange_token — that returns a user
    // token without page permissions and breaks publishing ("impersonating a user's page").
    if (account.platform === 'facebook' || account.platform === 'instagram') {
      results.push({
        accountId: account.id,
        platform: account.platform,
        status: 'skipped',
        reason: 'page tokens are not user-exchangeable',
      });
      continue;
    }

    const rawToken = account.access_token as string;
    const token = await readToken(rawToken);
    if (seenTokens.has(rawToken)) continue;
    seenTokens.add(rawToken);

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
      const encrypted = await writeToken(data.access_token);
      await service
        .from('social_accounts')
        .update({ access_token: encrypted, page_access_token: encrypted, token_expires_at: expiresAt })
        .eq('access_token', rawToken);

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
      await refreshCanvaToken(service, conn);
      results.push({ workspaceId: conn.workspace_id, clientId: conn.client_id, status: 'refreshed' });
    } catch (err) {
      results.push({
        workspaceId: conn.workspace_id,
        clientId: conn.client_id,
        status: 'failed',
        error: (err as Error).message,
      });
    }
  }

  return results;
}
