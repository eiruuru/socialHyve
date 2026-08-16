import { handleOptions, redirectResponse } from '../_shared/cors.ts';
import { getServiceClient, META_GRAPH } from '../_shared/supabase.ts';
import { encryptAccountTokenFields } from '../_shared/accountTokens.ts';
import { debugTokenType, fetchGrantedPages, getGrantedScopes, resolvePageAccessToken } from '../_shared/metaPages.ts';

const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '';
const META_REDIRECT_URI = Deno.env.get('META_REDIRECT_URI') || '';
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

function accountsRedirect(params: Record<string, string>, clientId?: string | null) {
  const search = new URLSearchParams(params);
  if (clientId) search.set('clientId', clientId);
  return redirectResponse(`${APP_URL}/app/settings/accounts?${search}`);
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

  let connectedClientId: string | null = null;

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
    const appAccessToken = `${META_APP_ID}|${META_APP_SECRET}`;

    const workspaceId = oauthState.workspace_id;
    const clientId = oauthState.client_id;
    connectedClientId = clientId;

    const pages = await fetchGrantedPages(longToken, appAccessToken);
    if (!pages.length) {
      const scopes = await getGrantedScopes(longToken, appAccessToken);
      const msg =
        'No Facebook Pages found after login. Pages managed in Meta Business require the business_management permission. ' +
        `Granted scopes: ${scopes}. Add business_management to your Login for Business configuration, set META_CONFIG_ID, and reconnect.`;
      return accountsRedirect({ error: msg }, clientId);
    }

    let existingAccounts: { platform: string; is_primary?: boolean }[] = [];
    const { data: primaryRows, error: primaryErr } = await service
      .from('social_accounts')
      .select('platform, is_primary')
      .eq('client_id', clientId);
    if (!primaryErr) {
      existingAccounts = primaryRows || [];
    }

    const hasPrimary = (platform: string) =>
      existingAccounts.some((a) => a.platform === platform && a.is_primary);

    const { data: workspaceAccountRows } = await service
      .from('social_accounts')
      .select('id, client_id, platform, external_id')
      .eq('workspace_id', workspaceId);

    const workspaceAccounts = workspaceAccountRows || [];
    const findWorkspaceOwners = (platform: string, externalId: string) =>
      workspaceAccounts.filter(
        (row) => row.platform === platform && String(row.external_id) === String(externalId),
      );

    const encryptedUserToken = await encryptAccountTokenFields({ user_access_token: longToken });

    async function refreshWorkspaceAccountTokens(
      platform: string,
      externalId: string,
      tokenFields: Record<string, string | null>,
    ) {
      await service
        .from('social_accounts')
        .update({
          ...tokenFields,
          ...encryptedUserToken,
          token_expires_at: tokenExpiresAt,
        })
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .eq('external_id', externalId);
    }

    let firstFbExternalId: string | null = null;
    let firstIgExternalId: string | null = null;
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
        user_access_token: longToken,
      });

      const fbOwners = findWorkspaceOwners('facebook', page.id);
      const fbOwnedByCurrent = fbOwners.some((row) => row.client_id === clientId);

      if (!fbOwners.length) {
        const { error: fbErr } = await service.from('social_accounts').upsert({
          workspace_id: workspaceId,
          client_id: clientId,
          platform: 'facebook',
          external_id: page.id,
          name: page.name,
          username: page.name,
          profile_picture_url: pagePictureUrl,
          ...tokenFields,
          page_id: page.id,
          token_expires_at: tokenExpiresAt,
        }, { onConflict: 'client_id,platform,external_id' });
        if (fbErr) throw fbErr;
      } else {
        await refreshWorkspaceAccountTokens('facebook', page.id, tokenFields);
        if (fbOwnedByCurrent) {
          const { error: fbErr } = await service.from('social_accounts').upsert({
            workspace_id: workspaceId,
            client_id: clientId,
            platform: 'facebook',
            external_id: page.id,
            name: page.name,
            username: page.name,
            profile_picture_url: pagePictureUrl,
            ...tokenFields,
            page_id: page.id,
            token_expires_at: tokenExpiresAt,
          }, { onConflict: 'client_id,platform,external_id' });
          if (fbErr) throw fbErr;
        }
      }

      importedFbIds.add(page.id);
      if (!firstFbExternalId) firstFbExternalId = page.id;

      const igAccount = page.instagram_business_account;
      if (igAccount?.id) {
        const igRes = await fetch(
          `${META_GRAPH}/${igAccount.id}?fields=id,username,profile_picture_url&access_token=${pageToken}`
        );
        const igData = await igRes.json();

        const igTokenFields = await encryptAccountTokenFields({
          access_token: pageToken,
          page_access_token: pageToken,
          user_access_token: longToken,
        });

        const igOwners = findWorkspaceOwners('instagram', igData.id);
        const igOwnedByCurrent = igOwners.some((row) => row.client_id === clientId);

        if (!igOwners.length) {
          const { error: igErr } = await service.from('social_accounts').upsert({
            workspace_id: workspaceId,
            client_id: clientId,
            platform: 'instagram',
            external_id: igData.id,
            name: igData.username || `IG ${igData.id}`,
            username: igData.username || null,
            profile_picture_url: igData.profile_picture_url || null,
            ...igTokenFields,
            page_id: page.id,
            ig_user_id: igData.id,
            token_expires_at: tokenExpiresAt,
          }, { onConflict: 'client_id,platform,external_id' });
          if (igErr) throw igErr;
        } else {
          await refreshWorkspaceAccountTokens('instagram', igData.id, igTokenFields);
          if (igOwnedByCurrent) {
            const { error: igErr } = await service.from('social_accounts').upsert({
              workspace_id: workspaceId,
              client_id: clientId,
              platform: 'instagram',
              external_id: igData.id,
              name: igData.username || `IG ${igData.id}`,
              username: igData.username || null,
              profile_picture_url: igData.profile_picture_url || null,
              ...igTokenFields,
              page_id: page.id,
              ig_user_id: igData.id,
              token_expires_at: tokenExpiresAt,
            }, { onConflict: 'client_id,platform,external_id' });
            if (igErr) throw igErr;
          }
        }

        importedIgIds.add(igData.id);
        if (!firstIgExternalId && page.id === firstFbExternalId) {
          firstIgExternalId = igData.id;
        }
      }
    }

    const { data: existingClientAccounts } = await service
      .from('social_accounts')
      .select('id, platform, external_id')
      .eq('client_id', clientId);

    const staleAccountIds = (existingClientAccounts || [])
      .filter((row) =>
        (row.platform === 'facebook' && !importedFbIds.has(String(row.external_id)))
        || (row.platform === 'instagram' && !importedIgIds.has(String(row.external_id)))
      )
      .map((row) => row.id);

    if (staleAccountIds.length) {
      await service.from('social_accounts').delete().in('id', staleAccountIds);
      await service.from('posts').update({ facebook_account_id: null }).in('facebook_account_id', staleAccountIds);
      await service.from('posts').update({ instagram_account_id: null }).in('instagram_account_id', staleAccountIds);
    }

    const { data: clientAccounts } = await service
      .from('social_accounts')
      .select('*')
      .eq('client_id', clientId);

    if (!hasPrimary('facebook') && firstFbExternalId) {
      const fbRow = (clientAccounts || []).find(
        (a) => a.platform === 'facebook' && a.external_id === firstFbExternalId,
      );
      if (fbRow) {
        const { error: fbPrimaryErr } = await service
          .from('social_accounts')
          .update({ is_primary: true })
          .eq('id', fbRow.id);
        if (fbPrimaryErr && !primaryErr) throw fbPrimaryErr;
      }
    }

    await service
      .from('social_accounts')
      .update({ ...encryptedUserToken, token_expires_at: tokenExpiresAt })
      .eq('client_id', clientId);

    if (!hasPrimary('instagram') && firstIgExternalId) {
      const igRow = (clientAccounts || []).find(
        (a) => a.platform === 'instagram' && a.external_id === firstIgExternalId,
      );
      if (igRow) {
        const { error: igPrimaryErr } = await service
          .from('social_accounts')
          .update({ is_primary: true })
          .eq('id', igRow.id);
        if (igPrimaryErr && !primaryErr) throw igPrimaryErr;
      }
    }

    return accountsRedirect({ connected: 'meta' }, clientId);
  } catch (err) {
    const msg = encodeURIComponent((err as Error).message);
    return accountsRedirect({ error: msg }, connectedClientId);
  }
});
