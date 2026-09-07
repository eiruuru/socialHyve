import { CANVA_API } from './supabase.ts';

export const CANVA_DESIGN_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

export type CanvaDesign = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type ServiceClient = {
  from: (table: string) => any;
};

export function mapCanvaDesignItems(items: unknown[] = []): CanvaDesign[] {
  return items.map((item) => {
    const design = item as Record<string, any>;
    const thumbnail = design.thumbnail as { url?: string } | undefined;
    return {
      id: String(design.id || ''),
      title: (design.title as string) || 'Untitled',
      thumbnailUrl: thumbnail?.url || null,
      createdAt: design.created_at,
      updatedAt: design.updated_at,
    };
  }).filter((design) => design.id);
}

export async function listCanvaDesignPage(accessToken: string, continuation?: string | null) {
  const listUrl = new URL(`${CANVA_API}/designs`);
  if (continuation) listUrl.searchParams.set('continuation', continuation);
  const res = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to list designs');
  return {
    designs: mapCanvaDesignItems(data.items || []),
    continuation: (data.continuation as string | null) || null,
  };
}

export async function loadCachedCanvaDesigns(
  service: ServiceClient,
  orgId: string,
  clientId?: string | null,
): Promise<{ designs: CanvaDesign[]; fresh: boolean }> {
  let query = service
    .from('canva_designs')
    .select('canva_design_id, title, thumbnail_url, last_synced_at')
    .eq('workspace_id', orgId)
    .order('last_synced_at', { ascending: false })
    .limit(50);

  query = clientId ? query.eq('client_id', clientId) : query.is('client_id', null);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  const newest = rows[0]?.last_synced_at ? new Date(rows[0].last_synced_at).getTime() : 0;
  const fresh = newest > 0 && Date.now() - newest < CANVA_DESIGN_CACHE_MAX_AGE_MS;

  return {
    designs: rows.map((row: Record<string, string | null>) => ({
      id: String(row.canva_design_id || ''),
      title: row.title || 'Untitled',
      thumbnailUrl: row.thumbnail_url || null,
      updatedAt: row.last_synced_at,
    })).filter((design: CanvaDesign) => design.id),
    fresh,
  };
}

export async function saveCachedCanvaDesigns(
  service: ServiceClient,
  orgId: string,
  clientId: string | null | undefined,
  designs: CanvaDesign[],
) {
  if (!designs.length) return;
  const syncedAt = new Date().toISOString();
  const rows = designs.map((design) => ({
    workspace_id: orgId,
    client_id: clientId || null,
    canva_design_id: design.id,
    title: design.title,
    thumbnail_url: design.thumbnailUrl,
    last_synced_at: syncedAt,
  }));
  const { error } = await service.from('canva_designs').upsert(rows, {
    onConflict: clientId ? 'client_id,canva_design_id' : 'workspace_id,canva_design_id',
  });
  if (error) throw error;
}

export async function warmCanvaDesignCache(
  service: ServiceClient,
  orgId: string,
  clientId: string | null | undefined,
  accessToken: string,
) {
  const page = await listCanvaDesignPage(accessToken);
  await saveCachedCanvaDesigns(service, orgId, clientId, page.designs);
  return page;
}

export function runInBackground(task: Promise<unknown>) {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) {
    runtime.waitUntil(task.catch(() => {}));
    return true;
  }
  void task.catch(() => {});
  return false;
}
