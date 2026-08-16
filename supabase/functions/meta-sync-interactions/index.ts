import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';
import {
  getPageToken,
  loadClientAssignedAccounts,
  markSyncState,
  syncFacebookComments,
  syncInstagramComments,
  syncPageConversations,
} from '../_shared/metaInteractions.ts';

const SYNC_DAYS = 30;

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));
    await requireUser(req);

    const clientId = body.clientId as string | undefined;
    if (!clientId) return jsonResponse({ error: 'clientId required' }, 400);

    const service = getServiceClient();
    const accounts = await loadClientAssignedAccounts(service, clientId);
    if (!accounts.length) {
      return jsonResponse({ synced: 0, message: 'No assigned social accounts' });
    }

    const sinceDate = new Date(Date.now() - SYNC_DAYS * 24 * 60 * 60 * 1000);
    const sinceUnix = Math.floor(sinceDate.getTime() / 1000);
    const sinceIso = sinceDate.toISOString();

    let total = 0;
    const errors: string[] = [];

    for (const account of accounts) {
      const token = await getPageToken(account);
      if (!token) {
        errors.push(`Missing token for ${account.platform} account ${account.id}`);
        continue;
      }

      try {
        if (account.platform === 'facebook') {
          total += await syncFacebookComments(service, clientId, account, token, sinceUnix);
          total += await syncPageConversations(service, clientId, account, token, 'facebook');
        } else if (account.platform === 'instagram') {
          total += await syncInstagramComments(service, clientId, account, token, sinceIso);
          total += await syncPageConversations(service, clientId, account, token, 'instagram');
        }
        await markSyncState(service, clientId, account.id);
      } catch (err) {
        errors.push(`${account.platform}: ${(err as Error).message}`);
      }
    }

    return jsonResponse({ synced: total, errors });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
