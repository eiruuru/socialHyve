import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { assertPlatformAdmin } from '../_shared/platformAdmin.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { user } = await requireUser(req);
    const service = getServiceClient();
    await assertPlatformAdmin(service, user.id);

    const body = await req.json().catch(() => ({}));
    const orgId = body.organizationId as string;
    if (!orgId) return jsonResponse({ error: 'organizationId required' }, 400);

    const { data: org, error: orgErr } = await service
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();

    if (orgErr) throw orgErr;
    if (!org) return jsonResponse({ error: 'Organization not found' }, 404);

    const [{ data: owner }, { data: members }, { data: clients }] = await Promise.all([
      service.from('profiles').select('id, email, full_name').eq('id', org.owner_id).maybeSingle(),
      service
        .from('organization_members')
        .select('user_id, role, created_at, profiles(id, email, full_name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true }),
      service
        .from('clients')
        .select('id, name, slug, created_at')
        .eq('organization_id', orgId)
        .order('name', { ascending: true }),
    ]);

    return jsonResponse({
      organization: org,
      owner,
      members: members ?? [],
      clients: clients ?? [],
    });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Forbidden' ? 403
      : message === 'Unauthorized' || message === 'Missing authorization' ? 401
      : 400;
    return jsonResponse({ error: message }, status);
  }
});
