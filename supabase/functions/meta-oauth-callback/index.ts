import { handleOptions, redirectResponse } from '../_shared/cors.ts';
import { getServiceClient, META_GRAPH } from '../_shared/supabase.ts';

const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '';
const META_REDIRECT_URI = Deno.env.get('META_REDIRECT_URI') || '';
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

async function exchangeCode(code: string): Promise<string> {
  const url = new URL(`${META_GRAPH}/oauth/access_token`);
  url.searchParams.set('client_id', META_APP_ID);
  url.searchParams.set('client_secret', META_APP_SECRET);
  url.searchParams.set('redirect_uri', META_REDIRECT_URI);
  url.searchParams.set('code', code);
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token;
}

async function getLongLivedToken(shortToken: string): Promise<{ token: string; expiresIn: number }> {
  const url = new URL(`${META_GRAPH}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', META_APP_ID);
  url.searchParams.set('client_secret', META_APP_SECRET);
  url.searchParams.set('fb_exchange_token', shortToken);
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { token: data.access_token, expiresIn: data.expires_in || 5184000 };
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return redirectResponse(`${APP_URL}/app/settings/accounts?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return redirectResponse(`${APP_URL}/app/settings/accounts?error=missing_code`);
  }

  try {
    const service = getServiceClient();
    const { data: oauthState, error: stateErr } = await service
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', 'meta')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (stateErr || !oauthState) {
      return redirectResponse(`${APP_URL}/app/settings/accounts?error=invalid_state`);
    }

    await service.from('oauth_states').delete().eq('id', oauthState.id);

    const shortToken = await exchangeCode(code);
    const { token: longToken, expiresIn } = await getLongLivedToken(shortToken);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const pagesRes = await fetch(
      `${META_GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account,picture&access_token=${longToken}`
    );
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(pagesData.error.message);

    const workspaceId = oauthState.workspace_id;

    for (const page of pagesData.data || []) {
      const pagePictureUrl = page.picture?.data?.url || null;

      await service.from('social_accounts').upsert({
        workspace_id: workspaceId,
        platform: 'facebook',
        external_id: page.id,
        name: page.name,
        username: page.name,
        profile_picture_url: pagePictureUrl,
        access_token: page.access_token,
        page_access_token: page.access_token,
        page_id: page.id,
        token_expires_at: tokenExpiresAt,
      }, { onConflict: 'workspace_id,platform,external_id' });

      const igAccount = page.instagram_business_account;
      if (igAccount?.id) {
        const igRes = await fetch(
          `${META_GRAPH}/${igAccount.id}?fields=id,username,profile_picture_url&access_token=${page.access_token}`
        );
        const igData = await igRes.json();

        await service.from('social_accounts').upsert({
          workspace_id: workspaceId,
          platform: 'instagram',
          external_id: igData.id,
          name: igData.username || `IG ${igData.id}`,
          username: igData.username || null,
          profile_picture_url: igData.profile_picture_url || null,
          access_token: page.access_token,
          page_access_token: page.access_token,
          page_id: page.id,
          ig_user_id: igData.id,
          token_expires_at: tokenExpiresAt,
        }, { onConflict: 'workspace_id,platform,external_id' });
      }
    }

    return redirectResponse(`${APP_URL}/app/settings/accounts?connected=meta`);
  } catch (err) {
    const msg = encodeURIComponent((err as Error).message);
    return redirectResponse(`${APP_URL}/app/settings/accounts?error=${msg}`);
  }
});
