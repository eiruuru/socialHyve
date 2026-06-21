import { handleOptions, redirectResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

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
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    await service.from('canva_connections').upsert({
      workspace_id: oauthState.workspace_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
    }, { onConflict: 'workspace_id' });

    return redirectResponse(`${APP_URL}/app/settings/canva?connected=canva`);
  } catch (err) {
    const msg = encodeURIComponent((err as Error).message);
    return redirectResponse(`${APP_URL}/app/settings/canva?error=${msg}`);
  }
});
