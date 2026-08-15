import { META_GRAPH } from '../_shared/supabase.ts';

export type MetaPage = {
  id: string;
  name: string;
  access_token?: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string };
};

const PAGE_FIELDS = 'id,name,access_token,instagram_business_account,picture';

async function graphGet(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  return res.json();
}

async function fetchPaginatedPages(
  initialUrl: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let url: string | null = initialUrl;

  while (url) {
    const data = await graphGet(url);
    if (data.error) throw new Error((data.error as { message?: string }).message || 'Meta API error');
    rows.push(...((data.data as Record<string, unknown>[]) || []));
    url = (data.paging as { next?: string })?.next || null;
  }

  return rows;
}

async function fetchMeAccounts(userToken: string): Promise<MetaPage[]> {
  const url =
    `${META_GRAPH}/me/accounts?fields=${encodeURIComponent(PAGE_FIELDS)}&limit=100` +
    `&access_token=${encodeURIComponent(userToken)}`;
  const rows = await fetchPaginatedPages(url);
  return rows as MetaPage[];
}

async function fetchBusinessPages(userToken: string): Promise<MetaPage[]> {
  const bizUrl =
    `${META_GRAPH}/me/businesses?fields=owned_pages{${PAGE_FIELDS}},client_pages{${PAGE_FIELDS}}&limit=50` +
    `&access_token=${encodeURIComponent(userToken)}`;
  const bizData = await graphGet(bizUrl);
  if (bizData.error) return [];

  const byId = new Map<string, MetaPage>();
  for (const biz of (bizData.data as Record<string, unknown>[]) || []) {
    for (const key of ['owned_pages', 'client_pages'] as const) {
      const container = biz[key] as { data?: MetaPage[] } | undefined;
      for (const page of container?.data || []) {
        byId.set(page.id, page);
      }
    }
  }
  return [...byId.values()];
}

async function fetchPageAccessToken(
  pageId: string,
  userToken: string,
): Promise<string | undefined> {
  const res = await fetch(
    `${META_GRAPH}/${pageId}?fields=access_token&access_token=${encodeURIComponent(userToken)}`,
  );
  const data = await res.json();
  return data.access_token as string | undefined;
}

export async function debugTokenType(
  token: string,
  appAccessToken: string,
): Promise<string | null> {
  const res = await fetch(
    `${META_GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appAccessToken)}`,
  );
  const data = await res.json();
  return (data.data?.type as string) || null;
}

async function collectPagesForUser(userToken: string): Promise<Map<string, MetaPage>> {
  const byId = new Map<string, MetaPage>();

  for (const page of await fetchMeAccounts(userToken)) {
    byId.set(page.id, page);
  }
  for (const page of await fetchBusinessPages(userToken)) {
    if (!byId.has(page.id)) byId.set(page.id, page);
  }

  return byId;
}

export async function fetchGrantedPages(
  userToken: string,
  _appAccessToken: string,
): Promise<MetaPage[]> {
  const byId = await collectPagesForUser(userToken);
  const pages = [...byId.values()];

  for (const page of pages) {
    if (!page.access_token) {
      page.access_token = await fetchPageAccessToken(page.id, userToken);
    }
  }

  return pages.filter((page) => page.access_token);
}

/** Resolve a Page access token from a user access token (handles corrupted stored page tokens). */
export async function resolvePageAccessToken(
  pageId: string,
  userToken: string,
  appAccessToken: string,
): Promise<string> {
  const byId = await collectPagesForUser(userToken);
  const matched = byId.get(pageId);
  if (matched?.access_token) return matched.access_token;

  if (matched && !matched.access_token) {
    const direct = await fetchPageAccessToken(pageId, userToken);
    if (direct) return direct;
  }

  const direct = await fetchPageAccessToken(pageId, userToken);
  if (direct) return direct;

  const debugRes = await fetch(
    `${META_GRAPH}/debug_token?input_token=${encodeURIComponent(userToken)}&access_token=${encodeURIComponent(appAccessToken)}`,
  );
  const debugData = await debugRes.json();
  const scopes = (debugData.data?.scopes as string[] | undefined)?.join(', ') || 'unknown';
  const knownPageIds = [...byId.keys()].slice(0, 8).join(', ') || 'none';

  throw new Error(
    `Could not get Page access token for ${pageId}. ` +
      `Pages visible to this login: ${knownPageIds}. ` +
      `Granted scopes: ${scopes}. Reconnect Meta for this client and select the Page in Settings → Accounts.`,
  );
}

export async function getGrantedScopes(userToken: string, appAccessToken: string): Promise<string> {
  const res = await fetch(
    `${META_GRAPH}/debug_token?input_token=${encodeURIComponent(userToken)}&access_token=${encodeURIComponent(appAccessToken)}`,
  );
  const data = await res.json();
  return (data.data?.scopes || []).join(', ') || 'none';
}
