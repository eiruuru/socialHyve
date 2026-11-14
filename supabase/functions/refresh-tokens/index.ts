import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { verifyCronSecret } from '../_shared/cronAuth.ts';
import { readToken, writeToken } from '../_shared/accountTokens.ts';
import { getServiceClient, META_GRAPH, refreshCanvaToken } from '../_shared/supabase.ts';
import {
  debugTokenInfo,
  fetchGrantedPages,
  isValidPageTokenFor,
  resolvePageAccessToken,
} from '../_shared/metaPages.ts';
import {
  decideUserTokenAction,
  expiryIsoFromExpiresIn,
  soonestExpiryIso,
} from '../_shared/metaTokenRefresh.ts';
import { notifyMetaReconnectRequired } from '../_shared/workflowNotify.ts';
import { releaseHeldPublishJobs } from '../_shared/publishRecovery.ts';

const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '';

const REFRESH_WINDOW_DAYS = 14;
const RECONNECT_ERROR = 'Facebook session is no longer valid. Reconnect Meta in Account → Meta Accounts.';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    if (!verifyCronSecret(req)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const service = getServiceClient();
    const refreshBefore = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const metaResults = await refreshMetaSessions(service);
    const canvaResults = await refreshCanvaAccounts(service, refreshBefore);

    return jsonResponse({
      meta: metaResults,
      canva: canvaResults,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

async function exchangeUserToken(currentToken: string): Promise<{ token: string; expiresIn: number | null }> {
  const url = new URL(`${META_GRAPH}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', META_APP_ID);
  url.searchParams.set('client_secret', META_APP_SECRET);
  url.searchParams.set('fb_exchange_token', currentToken);

  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Meta token exchange failed');
  if (!data.access_token) throw new Error('Meta token exchange returned no token');

  const expiresIn = typeof data.expires_in === 'number' && data.expires_in > 0
    ? data.expires_in
    : null;
  return { token: data.access_token, expiresIn };
}

async function refreshMetaSessions(service: ReturnType<typeof getServiceClient>) {
  const { data: sessions, error } = await service
    .from('workspace_meta_sessions')
    .select('*');
  if (error) throw error;

  const results = [];
  for (const session of sessions || []) {
    try {
      results.push(await refreshMetaSession(service, session));
    } catch (err) {
      results.push({
        sessionId: session.id,
        status: 'failed',
        error: (err as Error).message,
      });
    }
  }
  return results;
}

async function refreshMetaSession(
  service: ReturnType<typeof getServiceClient>,
  session: Record<string, unknown>,
) {
  const sessionId = session.id as string;
  const checkedAt = new Date().toISOString();
  const appAccessToken = `${META_APP_ID}|${META_APP_SECRET}`;
  const wasReconnect = session.connection_status === 'needs_reconnect';

  const userToken = await readToken(session.user_access_token as string);
  if (!userToken) {
    await markNeedsReconnect(service, session, RECONNECT_ERROR, checkedAt);
    return { sessionId, status: 'needs_reconnect', reason: 'missing_token' };
  }

  const info = await debugTokenInfo(userToken, appAccessToken);
  if (!info.ok) {
    await service.from('workspace_meta_sessions').update({
      last_checked_at: checkedAt,
      last_refresh_error: info.error,
    }).eq('id', sessionId);
    return { sessionId, status: 'failed', error: info.error };
  }

  const decision = decideUserTokenAction({
    isValid: info.isValid,
    expiresAt: info.expiresAt,
    dataAccessExpiresAt: info.dataAccessExpiresAt,
    issuedAt: info.issuedAt,
    refreshedAt: (session.updated_at as string | null) || null,
  });

  if (decision.action === 'reconnect') {
    await markNeedsReconnect(service, session, RECONNECT_ERROR, checkedAt);
    return { sessionId, status: 'needs_reconnect', reason: decision.reason };
  }

  if (decision.action === 'keep') {
    const expiry = soonestExpiryIso(info.expiresAt, info.dataAccessExpiresAt);
    const patch: Record<string, unknown> = {
      last_checked_at: checkedAt,
      last_refresh_error: null,
    };
    if (expiry) patch.token_expires_at = expiry;
    if (wasReconnect) patch.connection_status = 'connected';
    await service.from('workspace_meta_sessions').update(patch).eq('id', sessionId);
    if (wasReconnect) {
      await releaseHeldPublishJobs(service, session.workspace_id as string).catch(() => {});
    }
    return { sessionId, status: 'kept', reason: decision.reason };
  }

  try {
    const exchanged = await exchangeUserToken(userToken);
    const exchangedInfo = await debugTokenInfo(exchanged.token, appAccessToken);
    const expiry = exchangedInfo.ok
      ? soonestExpiryIso(exchangedInfo.expiresAt, exchangedInfo.dataAccessExpiresAt)
      : null;
    const tokenExpiresAt = expiry || expiryIsoFromExpiresIn(exchanged.expiresIn);
    const encrypted = await writeToken(exchanged.token);
    const refreshedAt = new Date().toISOString();

    await service.from('workspace_meta_sessions').update({
      user_access_token: encrypted,
      token_expires_at: tokenExpiresAt,
      connection_status: 'connected',
      last_refresh_error: null,
      last_checked_at: refreshedAt,
      updated_at: refreshedAt,
    }).eq('id', sessionId);

    const pageResult = await rewritePageTokens(
      service,
      sessionId,
      exchanged.token,
      appAccessToken,
      tokenExpiresAt,
    );
    await releaseHeldPublishJobs(service, session.workspace_id as string).catch(() => {});

    return {
      sessionId,
      status: 'refreshed',
      reason: decision.reason,
      expiresAt: tokenExpiresAt,
      pagesUpdated: pageResult.updated,
      pageErrors: pageResult.errors,
    };
  } catch (err) {
    const message = (err as Error).message;
    await service.from('workspace_meta_sessions').update({
      last_checked_at: checkedAt,
      last_refresh_error: message,
    }).eq('id', sessionId);
    return { sessionId, status: 'failed', error: message, reason: decision.reason };
  }
}

async function markNeedsReconnect(
  service: ReturnType<typeof getServiceClient>,
  session: Record<string, unknown>,
  message: string,
  checkedAt: string,
) {
  const alreadyFlagged = session.connection_status === 'needs_reconnect';
  const { error } = await service.from('workspace_meta_sessions').update({
    connection_status: 'needs_reconnect',
    last_refresh_error: message,
    last_checked_at: checkedAt,
  }).eq('id', session.id);
  if (error) throw error;

  if (!alreadyFlagged) {
    await notifyMetaReconnectRequired(service, {
      workspaceId: session.workspace_id as string,
      accountName: (session.meta_user_name as string) || 'Facebook account',
      detail: message,
    }).catch(() => {});
  }
}

async function rewritePageTokens(
  service: ReturnType<typeof getServiceClient>,
  sessionId: string,
  userToken: string,
  appAccessToken: string,
  userExpiresAt: string | null,
) {
  const pages = await fetchGrantedPages(userToken, appAccessToken);
  const { data: accounts, error } = await service
    .from('social_accounts')
    .select('id, platform, external_id, page_id, ig_user_id')
    .eq('meta_session_id', sessionId);
  if (error) throw error;

  let updated = 0;
  const errors: string[] = [];

  for (const account of accounts || []) {
    try {
      const page = pages.find((candidate) => accountMatchesPage(account, candidate));
      if (!page?.access_token && !account.page_id) continue;

      let pageToken = page?.access_token || '';
      const pageId = String(account.page_id || page?.id || account.external_id || '');
      if (pageToken) {
        const pageInfo = await debugTokenInfo(pageToken, appAccessToken);
        if (!pageInfo.ok || !isValidPageTokenFor(pageInfo, pageId)) {
          pageToken = await resolvePageAccessToken(pageId, userToken, appAccessToken);
        }
      } else if (pageId) {
        pageToken = await resolvePageAccessToken(pageId, userToken, appAccessToken);
      }
      if (!pageToken) continue;

      const pageInfo = await debugTokenInfo(pageToken, appAccessToken);
      const pageExpiry = pageInfo.ok
        ? soonestExpiryIso(pageInfo.expiresAt, pageInfo.dataAccessExpiresAt)
        : userExpiresAt;
      const encrypted = await writeToken(pageToken);
      const { error: updateError } = await service.from('social_accounts').update({
        access_token: encrypted,
        page_access_token: encrypted,
        token_expires_at: pageExpiry,
      }).eq('id', account.id);
      if (updateError) throw updateError;
      updated += 1;
    } catch (err) {
      errors.push(`${account.id}: ${(err as Error).message}`);
    }
  }

  return { updated, errors };
}

function accountMatchesPage(
  account: Record<string, unknown>,
  page: { id: string; instagram_business_account?: { id: string } },
): boolean {
  if (account.platform === 'facebook') {
    return page.id === account.external_id || page.id === account.page_id;
  }
  const igId = account.ig_user_id || account.external_id;
  return page.instagram_business_account?.id === igId || page.id === account.page_id;
}

async function refreshCanvaAccounts(service: ReturnType<typeof getServiceClient>, refreshBefore: string) {
  const { data: connections } = await service
    .from('canva_connections')
    .select('*')
    .lte('token_expires_at', refreshBefore);

  const results = [];

  for (const conn of connections || []) {
    try {
      await refreshCanvaToken(service, conn);
      results.push({ workspaceId: conn.workspace_id, clientId: conn.client_id, status: 'refreshed' });
    } catch (err) {
      results.push({
        workspaceId: conn.workspace_id,
        clientId: conn.client_id,
        status: 'failed',
        error: (err as Error).message,
      });
    }
  }

  return results;
}
