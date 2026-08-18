import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { readToken } from '../_shared/accountTokens.ts';
import { getServiceClient, META_GRAPH, requireUser } from '../_shared/supabase.ts';

async function loadClientAccountsForInstagram(
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

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const query = String(body.query || '').trim();
    const instagramAccountId = String(body.instagramAccountId || '');

    if (!query || query.length < 2) return jsonResponse({ locations: [] });
    if (!instagramAccountId) return jsonResponse({ error: 'instagramAccountId required' }, 400);

    const service = getServiceClient();
    const account = await loadClientAccountsForInstagram(service, instagramAccountId);
    const token = await readToken((account.page_access_token || account.access_token) as string);
    if (!token) throw new Error('Missing Meta credentials');

    const url = new URL(`${META_GRAPH}/pages/search`);
    url.searchParams.set('type', 'place');
    url.searchParams.set('q', query);
    url.searchParams.set('fields', 'id,name,location{name,city,country}');
    url.searchParams.set('access_token', token);

    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const locations = (data.data || []).map((row: Record<string, unknown>) => {
      const location = row.location as Record<string, string> | undefined;
      return {
        id: row.id,
        name: row.name,
        city: location?.city || null,
        country: location?.country || null,
      };
    });

    return jsonResponse({ locations });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
