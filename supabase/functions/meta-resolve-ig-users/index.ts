import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { readToken } from '../_shared/accountTokens.ts';
import { getServiceClient, META_GRAPH, requireUser } from '../_shared/supabase.ts';

function normalizeUsername(value: string): string {
  return value.replace(/^@/, '').trim().toLowerCase();
}

async function loadInstagramAccount(
  service: ReturnType<typeof getServiceClient>,
  instagramAccountId: string,
) {
  const { data: account, error } = await service
    .from('social_accounts')
    .select('*')
    .eq('id', instagramAccountId)
    .maybeSingle();
  if (error) throw error;
  if (!account || account.platform !== 'instagram') {
    throw new Error('Instagram account not found');
  }
  return account;
}

async function resolveUsername(
  igUserId: string,
  token: string,
  username: string,
): Promise<string | null> {
  const fields = `business_discovery.username(${username}){id,username}`;
  const url = new URL(`${META_GRAPH}/${igUserId}`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('access_token', token);

  const res = await fetch(url);
  const data = await res.json();
  if (data.error) return null;
  return data.business_discovery?.id || null;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const rawUsernames = Array.isArray(body.usernames) ? body.usernames : [];
    const instagramAccountId = String(body.instagramAccountId || '');

    if (!instagramAccountId) return jsonResponse({ error: 'instagramAccountId required' }, 400);

    const usernames = [...new Set(
      rawUsernames.map((value: unknown) => normalizeUsername(String(value || ''))).filter(Boolean),
    )];

    if (!usernames.length) return jsonResponse({ resolved: [], failed: [] });

    const service = getServiceClient();
    const account = await loadInstagramAccount(service, instagramAccountId);
    const igUserId = String(account.ig_user_id || account.external_id || '');
    const token = await readToken((account.page_access_token || account.access_token) as string);
    if (!igUserId || !token) throw new Error('Missing Meta credentials');

    const resolved: Array<{ username: string; id: string }> = [];
    const failed: string[] = [];

    for (const username of usernames) {
      const id = await resolveUsername(igUserId, token, username);
      if (id) resolved.push({ username, id });
      else failed.push(username);
    }

    return jsonResponse({ resolved, failed });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
