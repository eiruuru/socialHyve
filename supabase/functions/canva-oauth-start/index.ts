import { assertOrgHasProPlan } from '../_shared/billing.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  getOrganizationForUser,
  getServiceClient,
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
    if (!CANVA_CLIENT_ID || !CANVA_REDIRECT_URI) {
      return jsonResponse({ error: 'Canva OAuth is not configured' }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const { supabase, user } = await requireUser(req);
    const org = await getOrganizationForUser(supabase, user.id);
    const clientId = body.clientId as string | undefined;

    if (clientId) {
      const client = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .maybeSingle();
      if (client.error || !client.data) {
        return jsonResponse({ error: 'Client not found or access denied' }, 403);
      }
    }

    const state = randomString(32);
    const codeVerifier = randomString(64);
    const codeChallenge = await sha256Base64Url(codeVerifier);

    const service = getServiceClient();
    await assertOrgHasProPlan(service, org.id, 'Canva import');
    await service.from('oauth_states').insert({
      workspace_id: org.id,
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
