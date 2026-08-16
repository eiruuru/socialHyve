import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, getWorkspaceForUser, randomString, requireUser } from '../_shared/supabase.ts';

const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_REDIRECT_URI = Deno.env.get('META_REDIRECT_URI') || '';
const META_CONFIG_ID = Deno.env.get('META_CONFIG_ID') || '';

// pages_messaging is not available via scope= — add Messenger product + include it in Login for Business (META_CONFIG_ID).
const SCOPES = [
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_engagement',
  'pages_manage_metadata',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_comments',
  'instagram_manage_messages',
].join(',');

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));
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
    if (META_CONFIG_ID) {
      authUrl.searchParams.set('config_id', META_CONFIG_ID);
    } else {
      authUrl.searchParams.set('scope', SCOPES);
    }
    if (body.rerequest) {
      authUrl.searchParams.set('auth_type', 'rerequest');
    }

    return jsonResponse({ url: authUrl.toString() });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
