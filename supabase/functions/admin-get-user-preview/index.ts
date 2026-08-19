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
    const userId = body.userId as string;
    if (!userId) return jsonResponse({ error: 'userId required' }, 400);

    const { data: profile, error: profileErr } = await service
      .from('profiles')
      .select('id, email, full_name, must_change_password, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!profile) return jsonResponse({ error: 'User not found' }, 404);

    const { data: orgMembers } = await service
      .from('organization_members')
      .select('role, organization_id, organizations(id, name, plan, subscription_status, owner_id)')
      .eq('user_id', userId);

    const { data: ownedOrgs } = await service
      .from('organizations')
      .select('id, name, plan, subscription_status, owner_id')
      .eq('owner_id', userId);

    let primaryOrgId = ownedOrgs?.[0]?.id as string | undefined;
    if (!primaryOrgId && orgMembers?.length) {
      const ownerMembership = orgMembers.find((m) => m.role === 'owner');
      primaryOrgId = (ownerMembership?.organization_id ?? orgMembers[0].organization_id) as string;
    }

    const [{ data: clients }, { data: clientMembers }] = await Promise.all([
      primaryOrgId
        ? service.from('clients').select('id, name, slug').eq('organization_id', primaryOrgId).order('name')
        : Promise.resolve({ data: [] }),
      service
        .from('client_members')
        .select('role, client_id, clients(id, name)')
        .eq('user_id', userId),
    ]);

    let queueSummary = { draft: 0, pending: 0, approved: 0, scheduled: 0 };

    if (primaryOrgId && (clients ?? []).length) {
      const clientIds = (clients ?? []).map((c) => c.id);
      const { data: posts } = await service
        .from('posts')
        .select('status, approval_status')
        .in('client_id', clientIds);

      for (const post of posts ?? []) {
        const approval = post.approval_status as string;
        if (approval === 'draft') queueSummary.draft += 1;
        if (approval === 'pending') queueSummary.pending += 1;
        if (approval === 'approved') queueSummary.approved += 1;
        if (post.status === 'scheduled') queueSummary.scheduled += 1;
      }
    }

    return jsonResponse({
      profile,
      organizationMemberships: orgMembers ?? [],
      ownedOrganizations: ownedOrgs ?? [],
      clientMemberships: clientMembers ?? [],
      clients: clients ?? [],
      primaryOrganizationId: primaryOrgId ?? null,
      queueSummary,
    });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Forbidden' ? 403
      : message === 'Unauthorized' || message === 'Missing authorization' ? 401
      : 400;
    return jsonResponse({ error: message }, status);
  }
});
