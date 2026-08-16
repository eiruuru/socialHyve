import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, getWorkspaceForUser, randomString, requireUser } from '../_shared/supabase.ts';

const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_REDIRECT_URI = Deno.env.get('META_REDIRECT_URI') || '';
const META_CONFIG_ID = Deno.env.get('META_CONFIG_ID') || '';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));

    if (!META_CONFIG_ID) {
      return jsonResponse({
        error: 'META_CONFIG_ID is not configured. Set it in .env and run bash scripts/set-secrets.sh.',
      }, 500);
    }

    if (body.useScopes === true || Deno.env.get('META_OAUTH_USE_SCOPES') === '1') {
      return jsonResponse({
        error: 'This Meta app requires Login for Business (config_id). Recreate your configuration in Meta Developer Console and update META_CONFIG_ID.',
      }, 400);
    }

    const { supabase, user } = await requireUser(req);
    const workspace = await getWorkspaceForUser(supabase, user.id);
    const state = randomString(32);

    const service = getServiceClient();
    await service.from('oauth_states').insert({
      workspace_id: workspace.id,
      client_id: null,
      provider: 'meta',
      state,
    });

    const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
    authUrl.searchParams.set('client_id', META_APP_ID);
    authUrl.searchParams.set('redirect_uri', META_REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');
    // Login for Business: config_id replaces scope — do not send scope or auth_type.
    authUrl.searchParams.set('config_id', META_CONFIG_ID);

    return jsonResponse({ url: authUrl.toString() });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
