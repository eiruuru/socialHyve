const ORG_ROLES = new Set(['owner', 'admin', 'editor', 'manager']);
const CLIENT_ROLES = new Set(['creatives_qa', 'guest']);

export function assertOrgRole(role: string): void {
  if (!ORG_ROLES.has(role)) throw new Error('Invalid organization role');
}

export function assertClientRole(role: string): void {
  if (!CLIENT_ROLES.has(role)) throw new Error('Invalid client role');
}

export async function syncOrganizationOwner(
  service: ReturnType<typeof import('./supabase.ts').getServiceClient>,
  organizationId: string,
  newOwnerUserId: string,
): Promise<void> {
  const { data: org, error: orgErr } = await service
    .from('organizations')
    .select('owner_id')
    .eq('id', organizationId)
    .maybeSingle();
  if (orgErr) throw orgErr;
  if (!org) throw new Error('Organization not found');

  const priorOwnerId = org.owner_id as string;

  const { error: orgUpdateErr } = await service
    .from('organizations')
    .update({ owner_id: newOwnerUserId, updated_at: new Date().toISOString() })
    .eq('id', organizationId);
  if (orgUpdateErr) throw orgUpdateErr;

  if (priorOwnerId && priorOwnerId !== newOwnerUserId) {
    const { data: priorMember } = await service
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', priorOwnerId)
      .maybeSingle();

    if (priorMember?.role === 'owner') {
      await service
        .from('organization_members')
        .update({ role: 'admin' })
        .eq('organization_id', organizationId)
        .eq('user_id', priorOwnerId);
    }
  }

  await service.from('organization_members').upsert(
    { organization_id: organizationId, user_id: newOwnerUserId, role: 'owner' },
    { onConflict: 'organization_id,user_id' },
  );
}

export async function assertNotOrgOwner(
  service: ReturnType<typeof import('./supabase.ts').getServiceClient>,
  organizationId: string,
  userId: string,
): Promise<void> {
  const { data: org, error } = await service
    .from('organizations')
    .select('owner_id')
    .eq('id', organizationId)
    .maybeSingle();
  if (error) throw error;
  if (org?.owner_id === userId) {
    throw new Error('Cannot remove the organization owner. Transfer ownership first.');
  }
}
