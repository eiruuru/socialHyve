import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createShortLink } from '../_shared/shortLinks.ts';
import { getOrganizationForUser, getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { supabase, user } = await requireUser(req);
    const org = await getOrganizationForUser(supabase, user.id);
    const body = await req.json().catch(() => ({}));
    const url = String(body.url || '').trim();
    const postId = body.postId ? String(body.postId) : null;

    if (!url) return jsonResponse({ error: 'url required' }, 400);

    const service = getServiceClient();
    const result = await createShortLink(service, {
      organizationId: org.id,
      originalUrl: url,
      postId,
    });

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
