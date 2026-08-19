import { isPlatformAdmin } from './platformAdmin.ts';
import { getServiceClient } from './supabase.ts';

async function buildQueueSummary(
  service: ReturnType<typeof getServiceClient>,
  primaryOrgId?: string,
) {
  const queueSummary = { draft: 0, pending: 0, approved: 0, scheduled: 0 };
  if (!primaryOrgId) return queueSummary;

  const { data: clients } = await service
    .from('clients')
    .select('id')
    .eq('organization_id', primaryOrgId);

  if (!clients?.length) return queueSummary;

  const clientIds = clients.map((c) => c.id);
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

  return queueSummary;
}

export async function buildUserDetail(
  service: ReturnType<typeof getServiceClient>,
  userId: string,
) {
  const { data: profile, error: profileErr } = await service
    .from('profiles')
    .select('id, email, full_name, must_change_password, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr) throw profileErr;
  if (!profile) return null;

  const [
    { data: orgMembers },
    { data: ownedOrgs },
    { data: clientMembers },
    platformAdmin,
    authResult,
  ] = await Promise.all([
    service
      .from('organization_members')
      .select('role, organization_id, created_at, organizations(id, name, plan, subscription_status, owner_id)')
      .eq('user_id', userId),
    service
      .from('organizations')
      .select('id, name, plan, subscription_status, owner_id, created_at')
      .eq('owner_id', userId),
    service
      .from('client_members')
      .select('role, client_id, created_at, clients(id, name, organization_id, organizations(id, name))')
      .eq('user_id', userId),
    isPlatformAdmin(service, userId),
    service.auth.admin.getUserById(userId),
  ]);

  let primaryOrgId = ownedOrgs?.[0]?.id as string | undefined;
  if (!primaryOrgId && orgMembers?.length) {
    const ownerMembership = orgMembers.find((m) => m.role === 'owner');
    primaryOrgId = (ownerMembership?.organization_id ?? orgMembers[0].organization_id) as string;
  }

  const [{ data: clients }, queueSummary] = await Promise.all([
    primaryOrgId
      ? service.from('clients').select('id, name, slug').eq('organization_id', primaryOrgId).order('name')
      : Promise.resolve({ data: [] }),
    buildQueueSummary(service, primaryOrgId),
  ]);

  const authUser = authResult.data?.user;

  return {
    profile,
    organizationMemberships: orgMembers ?? [],
    ownedOrganizations: ownedOrgs ?? [],
    clientMemberships: clientMembers ?? [],
    clients: clients ?? [],
    primaryOrganizationId: primaryOrgId ?? null,
    queueSummary,
    isPlatformAdmin: platformAdmin,
    auth: authUser
      ? {
          createdAt: authUser.created_at,
          lastSignInAt: authUser.last_sign_in_at,
          emailConfirmedAt: authUser.email_confirmed_at,
        }
      : null,
  };
}
