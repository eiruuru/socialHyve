import { handleOptions, jsonResponse, redirectResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug')?.trim();
    if (!slug) return jsonResponse({ error: 'slug required' }, 400);

    const service = getServiceClient();
    const { data: link, error } = await service
      .from('short_links')
      .select('id, original_url, click_count')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    if (!link) return jsonResponse({ error: 'Link not found' }, 404);

    await service
      .from('short_links')
      .update({ click_count: (link.click_count || 0) + 1 })
      .eq('id', link.id);

    if (req.method === 'GET' && url.searchParams.get('json') === '1') {
      return jsonResponse({ url: link.original_url });
    }

    return redirectResponse(link.original_url as string);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
