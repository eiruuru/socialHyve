import { handleOptions, redirectResponse } from '../_shared/cors.ts';
import { getServiceClient, META_GRAPH } from '../_shared/supabase.ts';
import { encryptAccountTokenFields } from '../_shared/accountTokens.ts';
import {
  debugTokenInfo,
  debugTokenType,
  fetchGrantedPages,
  getGrantedScopes,
  resolvePageAccessToken,
} from '../_shared/metaPages.ts';

const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '';
const META_REDIRECT_URI = Deno.env.get('META_REDIRECT_URI') || '';
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

function metaRedirect(params: Record<string, string>) {
  const search = new URLSearchParams({ tab: 'meta', ...params });
  return redirectResponse(`${APP_URL}/app/settings/account?${search}`);
}

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

async function fetchMetaUserName(userToken: string): Promise<string> {
  const res = await fetch(
    `${META_GRAPH}/me?fields=name&access_token=${encodeURIComponent(userToken)}`,
  );
  const data = await res.json();
  if (data.error) return 'Facebook account';
  return (data.name as string) || 'Facebook account';
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return metaRedirect({ error });
  }

  if (!code || !state) {
    return metaRedirect({ error: 'missing_code' });
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
      return metaRedirect({ error: 'invalid_state' });
    }

    await service.from('oauth_states').delete().eq('id', oauthState.id);

    const shortToken = await exchangeCode(code);
    const { token: longToken, expiresIn } = await getLongLivedToken(shortToken);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const appAccessToken = `${META_APP_ID}|${META_APP_SECRET}`;
    const workspaceId = oauthState.workspace_id;

    const pages = await fetchGrantedPages(longToken, appAccessToken);
    if (!pages.length) {
      const scopes = await getGrantedScopes(longToken, appAccessToken);
      const msg =
        'No Facebook Pages found after login. Pages managed in Meta Business require the business_management permission. ' +
        `Granted scopes: ${scopes}. Add business_management to your Login for Business configuration, set META_CONFIG_ID, and reconnect.`;
      return metaRedirect({ error: msg });
    }

    const tokenInfo = await debugTokenInfo(longToken, appAccessToken);
    const metaUserId = tokenInfo.userId || tokenInfo.profileId;
    if (!metaUserId) {
      throw new Error('Could not resolve Facebook user id from OAuth token.');
    }

    const metaUserName = await fetchMetaUserName(longToken);
    const encryptedUserToken = await encryptAccountTokenFields({ user_access_token: longToken });

    const { data: sessionRow, error: sessionErr } = await service
      .from('workspace_meta_sessions')
      .upsert({
        workspace_id: workspaceId,
        meta_user_id: metaUserId,
        meta_user_name: metaUserName,
        user_access_token: encryptedUserToken.user_access_token,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,meta_user_id' })
      .select('id')
      .single();

    if (sessionErr || !sessionRow) throw sessionErr || new Error('Failed to save Meta session');

    const metaSessionId = sessionRow.id as string;
    const importedFbIds = new Set<string>();
    const importedIgIds = new Set<string>();

    for (const page of pages) {
      const pagePictureUrl = page.picture?.data?.url || null;

      let pageToken = page.access_token!;
      const pageTokenType = await debugTokenType(pageToken, appAccessToken);
      if (pageTokenType !== 'PAGE') {
        pageToken = await resolvePageAccessToken(page.id, longToken, appAccessToken);
      }

      const tokenFields = await encryptAccountTokenFields({
        access_token: pageToken,
        page_access_token: pageToken,
      });

      const { error: fbErr } = await service.from('social_accounts').upsert({
        workspace_id: workspaceId,
        meta_session_id: metaSessionId,
        platform: 'facebook',
        external_id: page.id,
        name: page.name,
        username: page.name,
        profile_picture_url: pagePictureUrl,
        ...tokenFields,
        page_id: page.id,
        token_expires_at: tokenExpiresAt,
      }, { onConflict: 'workspace_id,platform,external_id' });
      if (fbErr) throw fbErr;

      importedFbIds.add(page.id);

      const igAccount = page.instagram_business_account;
      if (igAccount?.id) {
        const igRes = await fetch(
          `${META_GRAPH}/${igAccount.id}?fields=id,username,profile_picture_url&access_token=${pageToken}`,
        );
        const igData = await igRes.json();

        const igTokenFields = await encryptAccountTokenFields({
          access_token: pageToken,
          page_access_token: pageToken,
        });

        const { error: igErr } = await service.from('social_accounts').upsert({
          workspace_id: workspaceId,
          meta_session_id: metaSessionId,
          platform: 'instagram',
          external_id: igData.id,
          name: igData.username || `IG ${igData.id}`,
          username: igData.username || null,
          profile_picture_url: igData.profile_picture_url || null,
          ...igTokenFields,
          page_id: page.id,
          ig_user_id: igData.id,
          token_expires_at: tokenExpiresAt,
        }, { onConflict: 'workspace_id,platform,external_id' });
        if (igErr) throw igErr;

        importedIgIds.add(String(igData.id));
      }
    }

    const { data: sessionAccounts } = await service
      .from('social_accounts')
      .select('id, platform, external_id')
      .eq('meta_session_id', metaSessionId);

    const staleAccountIds = (sessionAccounts || [])
      .filter((row) =>
        (row.platform === 'facebook' && !importedFbIds.has(String(row.external_id)))
        || (row.platform === 'instagram' && !importedIgIds.has(String(row.external_id)))
      )
      .map((row) => row.id);

    if (staleAccountIds.length) {
      await service.from('client_social_account_assignments').delete().in('social_account_id', staleAccountIds);
      await service.from('posts').update({ facebook_account_id: null }).in('facebook_account_id', staleAccountIds);
      await service.from('posts').update({ instagram_account_id: null }).in('instagram_account_id', staleAccountIds);
      await service.from('social_accounts').delete().in('id', staleAccountIds);
    }

    return metaRedirect({ connected: 'meta' });
  } catch (err) {
    const msg = encodeURIComponent((err as Error).message);
    return metaRedirect({ error: msg });
  }
});
