import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, getWorkspaceForUser, randomString, requireUser } from '../_shared/supabase.ts';

const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_REDIRECT_URI = Deno.env.get('META_REDIRECT_URI') || '';

const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
].join(',');

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { supabase, user } = await requireUser(req);
    const workspace = await getWorkspaceForUser(supabase, user.id);
    const state = randomString(32);

    const service = getServiceClient();
    await service.from('oauth_states').insert({
      workspace_id: workspace.id,
      provider: 'meta',
      state,
    });

    const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
    authUrl.searchParams.set('client_id', META_APP_ID);
    authUrl.searchParams.set('redirect_uri', META_REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('response_type', 'code');

    return jsonResponse({ url: authUrl.toString() });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
