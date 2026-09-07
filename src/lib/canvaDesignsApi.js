import { invokeFunction } from '@/lib/supabaseFunctions';
import { CANVA_DESIGNS_STALE_MS, canvaDesignsQueryKey } from '@/lib/canvaDesigns';

export async function listCanvaDesigns({ clientId, continuation, fresh } = {}) {
  return invokeFunction('canvaListDesigns', {
    clientId,
    continuation: continuation || undefined,
    fresh: fresh || undefined,
  });
}

export function prefetchCanvaDesigns(queryClient, clientId) {
  if (!queryClient || !clientId) return Promise.resolve();
  return queryClient.prefetchQuery({
    queryKey: canvaDesignsQueryKey(clientId),
    queryFn: () => listCanvaDesigns({ clientId }),
    staleTime: CANVA_DESIGNS_STALE_MS,
  });
}
