import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  CANVA_API,
  getServiceClient,
  getWorkspaceForUser,
  randomString,
  requireUser,
  sha256Base64Url,
} from '../_shared/supabase.ts';

const CANVA_CLIENT_ID = Deno.env.get('CANVA_CLIENT_ID') || '';
const CANVA_REDIRECT_URI = Deno.env.get('CANVA_REDIRECT_URI') || '';

const SCOPES = ['design:meta:read', 'design:content:read', 'asset:read'].join(' ');

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));
    const { supabase, user } = await requireUser(req);
    const workspace = await getWorkspaceForUser(supabase, user.id);
    const clientId = body.clientId as string | undefined;
    const state = randomString(32);
    const codeVerifier = randomString(64);
    const codeChallenge = await sha256Base64Url(codeVerifier);

    const service = getServiceClient();
    await service.from('oauth_states').insert({
      workspace_id: workspace.id,
      client_id: clientId || null,
      provider: 'canva',
      state,
      code_verifier: codeVerifier,
    });

    const authUrl = new URL('https://www.canva.com/api/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', CANVA_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', CANVA_REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return jsonResponse({ url: authUrl.toString() });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
