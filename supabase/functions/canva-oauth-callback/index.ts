import { handleOptions, redirectResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { encryptAccountTokenFields } from '../_shared/accountTokens.ts';

const CANVA_CLIENT_ID = Deno.env.get('CANVA_CLIENT_ID') || '';
const CANVA_CLIENT_SECRET = Deno.env.get('CANVA_CLIENT_SECRET') || '';
const CANVA_REDIRECT_URI = Deno.env.get('CANVA_REDIRECT_URI') || '';
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

async function exchangeToken(code: string, codeVerifier: string) {
  const credentials = btoa(`${CANVA_CLIENT_ID}:${CANVA_CLIENT_SECRET}`);
  const res = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CANVA_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Token exchange failed');
  return data;
}

async function saveCanvaConnection(
  service: ReturnType<typeof getServiceClient>,
  oauthState: { workspace_id: string; client_id: string | null },
  tokens: { access_token: string; refresh_token: string; expires_in?: number },
) {
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
  const tokenFields = await encryptAccountTokenFields({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  const payload = {
    workspace_id: oauthState.workspace_id,
    client_id: oauthState.client_id,
    ...tokenFields,
    token_expires_at: expiresAt,
  };

  if (oauthState.client_id) {
    const { data: updated, error: updateErr } = await service
      .from('canva_connections')
      .update(payload)
      .eq('client_id', oauthState.client_id)
      .select('id');

    if (updateErr) throw updateErr;

    if (!updated?.length) {
      const { error: insertErr } = await service.from('canva_connections').insert(payload);
      if (insertErr) throw insertErr;
    }
    return;
  }

  const { data: updated, error: updateErr } = await service
    .from('canva_connections')
    .update(payload)
    .eq('workspace_id', oauthState.workspace_id)
    .is('client_id', null)
    .select('id');

  if (updateErr) throw updateErr;

  if (!updated?.length) {
    const { error: insertErr } = await service.from('canva_connections').insert(payload);
    if (insertErr) throw insertErr;
  }
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return redirectResponse(`${APP_URL}/app/settings/canva?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return redirectResponse(`${APP_URL}/app/settings/canva?error=missing_code`);
  }

  try {
    const service = getServiceClient();
    const { data: oauthState, error: stateErr } = await service
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', 'canva')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (stateErr || !oauthState || !oauthState.code_verifier) {
      return redirectResponse(`${APP_URL}/app/settings/canva?error=invalid_state`);
    }

    await service.from('oauth_states').delete().eq('id', oauthState.id);

    const tokens = await exchangeToken(code, oauthState.code_verifier);
    await saveCanvaConnection(service, oauthState, tokens);

    const clientParam = oauthState.client_id ? `&clientId=${oauthState.client_id}` : '';
    return redirectResponse(`${APP_URL}/app/settings/canva?connected=canva${clientParam}`);
  } catch (err) {
    const msg = encodeURIComponent((err as Error).message);
    return redirectResponse(`${APP_URL}/app/settings/canva?error=${msg}`);
  }
});
