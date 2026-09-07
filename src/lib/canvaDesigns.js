export const CANVA_DESIGNS_QUERY_KEY = 'canva-designs';
export const CANVA_DESIGNS_STALE_MS = 5 * 60 * 1000;

export function canvaDesignsQueryKey(clientId) {
  return [CANVA_DESIGNS_QUERY_KEY, clientId];
}

export function mapCachedCanvaDesigns(rows = []) {
  return rows.map((row) => ({
    id: row.canva_design_id,
    title: row.title || 'Untitled',
    thumbnailUrl: row.thumbnail_url || null,
    updatedAt: row.last_synced_at || null,
  }));
}

export function mergeCanvaDesignPages(current, nextPage) {
  const existing = current?.designs || [];
  const incoming = nextPage?.designs || [];
  const seen = new Set(existing.map((design) => design.id));
  const designs = [...existing];
  for (const design of incoming) {
    if (!design?.id || seen.has(design.id)) continue;
    seen.add(design.id);
    designs.push(design);
  }
  return {
    designs,
    continuation: nextPage?.continuation ?? null,
    cached: false,
  };
}
