import { META_GRAPH } from '../_shared/supabase.ts';

export type MetaPage = {
  id: string;
  name: string;
  access_token?: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string };
};

export async function fetchGrantedPages(
  userToken: string,
  appAccessToken: string,
): Promise<MetaPage[]> {
  const fields = 'id,name,access_token,instagram_business_account,picture';
  const byId = new Map<string, MetaPage>();

  const accountsRes = await fetch(
    `${META_GRAPH}/me/accounts?fields=${encodeURIComponent(fields)}&limit=100&access_token=${encodeURIComponent(userToken)}`,
  );
  const accountsData = await accountsRes.json();
  if (accountsData.error) throw new Error(accountsData.error.message);
  for (const page of accountsData.data || []) {
    byId.set(page.id, page);
  }

  if (byId.size === 0) {
    const bizRes = await fetch(
      `${META_GRAPH}/me/businesses?fields=client_pages{${fields}}&limit=50&access_token=${encodeURIComponent(userToken)}`,
    );
    const bizData = await bizRes.json();
    if (bizData.error) throw new Error(bizData.error.message);
    for (const biz of bizData.data || []) {
      for (const page of biz.client_pages?.data || []) {
        byId.set(page.id, page);
      }
    }
  }

  const pages = [...byId.values()];
  for (const page of pages) {
    if (!page.access_token) {
      page.access_token = await fetchPageAccessToken(page.id, userToken, appAccessToken);
    }
  }

  return pages.filter((page) => page.access_token);
}

async function fetchPageAccessToken(
  pageId: string,
  userToken: string,
  appAccessToken: string,
): Promise<string | undefined> {
  const res = await fetch(
    `${META_GRAPH}/${pageId}?fields=access_token&access_token=${encodeURIComponent(userToken)}`,
  );
  const data = await res.json();
  if (data.access_token) return data.access_token;

  if (data.error) {
    const debugRes = await fetch(
      `${META_GRAPH}/debug_token?input_token=${encodeURIComponent(userToken)}&access_token=${encodeURIComponent(appAccessToken)}`,
    );
    const debugData = await debugRes.json();
    const scopes = debugData.data?.scopes?.join(', ') || 'unknown';
    throw new Error(
      `Could not get Page access token for ${pageId}. Granted scopes: ${scopes}. ` +
        'Ensure business_management is in your Login for Business config.',
    );
  }

  return undefined;
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

/** Resolve a Page access token from a user access token (handles corrupted stored page tokens). */
export async function resolvePageAccessToken(
  pageId: string,
  userToken: string,
  appAccessToken: string,
): Promise<string> {
  const fields = 'id,access_token';

  const accountsRes = await fetch(
    `${META_GRAPH}/me/accounts?fields=${encodeURIComponent(fields)}&limit=100&access_token=${encodeURIComponent(userToken)}`,
  );
  const accountsData = await accountsRes.json();
  if (!accountsData.error) {
    const page = (accountsData.data || []).find((p: { id: string }) => p.id === pageId);
    if (page?.access_token) return page.access_token as string;
  }

  const bizRes = await fetch(
    `${META_GRAPH}/me/businesses?fields=client_pages{${fields}}&limit=50&access_token=${encodeURIComponent(userToken)}`,
  );
  const bizData = await bizRes.json();
  if (!bizData.error) {
    for (const biz of bizData.data || []) {
      const page = (biz.client_pages?.data || []).find((p: { id: string }) => p.id === pageId);
      if (page?.access_token) return page.access_token as string;
    }
  }

  const direct = await fetchPageAccessToken(pageId, userToken, appAccessToken);
  if (direct) return direct;

  throw new Error(
    `Could not get Page access token for ${pageId}. Reconnect Meta in Settings → Accounts.`,
  );
}

export async function getGrantedScopes(userToken: string, appAccessToken: string): Promise<string> {
  const res = await fetch(
    `${META_GRAPH}/debug_token?input_token=${encodeURIComponent(userToken)}&access_token=${encodeURIComponent(appAccessToken)}`,
  );
  const data = await res.json();
  return (data.data?.scopes || []).join(', ') || 'none';
}
