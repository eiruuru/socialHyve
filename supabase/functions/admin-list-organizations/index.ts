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

    const { data: orgs, error: orgErr } = await service
      .from('organizations')
      .select('id, name, owner_id, plan, subscription_status, subscription_current_period_end, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (orgErr) throw orgErr;

    const ownerIds = [...new Set((orgs ?? []).map((o) => o.owner_id).filter(Boolean))];
    const { data: owners } = ownerIds.length
      ? await service.from('profiles').select('id, email, full_name').in('id', ownerIds)
      : { data: [] };

    const ownerById = new Map((owners ?? []).map((p) => [p.id, p]));

    const orgIds = (orgs ?? []).map((o) => o.id);
    const { data: memberCounts } = orgIds.length
      ? await service.from('organization_members').select('organization_id').in('organization_id', orgIds)
      : { data: [] };

    const countByOrg = new Map<string, number>();
    for (const row of memberCounts ?? []) {
      const id = row.organization_id as string;
      countByOrg.set(id, (countByOrg.get(id) ?? 0) + 1);
    }

    const organizations = (orgs ?? []).map((org) => ({
      ...org,
      owner: ownerById.get(org.owner_id) ?? null,
      memberCount: countByOrg.get(org.id) ?? 0,
    }));

    return jsonResponse({ organizations });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Forbidden' ? 403
      : message === 'Unauthorized' || message === 'Missing authorization' ? 401
      : 400;
    return jsonResponse({ error: message }, status);
  }
});
