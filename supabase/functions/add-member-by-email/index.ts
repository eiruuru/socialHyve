import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getOrganizationForUser, getServiceClient, requireUser } from '../_shared/supabase.ts';

type MemberType = 'organization' | 'client';

async function assertCanManageTeam(
  service: ReturnType<typeof getServiceClient>,
  userId: string,
  orgId: string,
): Promise<void> {
  const { data: org } = await service
    .from('organizations')
    .select('owner_id')
    .eq('id', orgId)
    .maybeSingle();
  if (org?.owner_id === userId) return;

  const { data: member } = await service
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (member && ['owner', 'admin'].includes(member.role as string)) return;
  throw new Error('Forbidden');
}

async function assertCanManageClient(
  service: ReturnType<typeof getServiceClient>,
  userId: string,
  clientId: string,
): Promise<{ organizationId: string }> {
  const { data: client, error } = await service
    .from('clients')
    .select('organization_id')
    .eq('id', clientId)
    .maybeSingle();
  if (error || !client) throw new Error('Client not found');

  const { data: orgMember } = await service
    .from('organization_members')
    .select('role')
    .eq('organization_id', client.organization_id)
    .eq('user_id', userId)
    .maybeSingle();

  const orgRole = orgMember?.role as string | undefined;
  if (orgRole && ['owner', 'admin', 'editor'].includes(orgRole)) {
    return { organizationId: client.organization_id as string };
  }

  if (orgRole === 'manager') {
    const { data: assignment } = await service
      .from('manager_client_assignments')
      .select('id')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .maybeSingle();
    if (assignment) return { organizationId: client.organization_id as string };
  }

  const { data: org } = await service
    .from('organizations')
    .select('owner_id')
    .eq('id', client.organization_id)
    .maybeSingle();
  if (org?.owner_id === userId) {
    return { organizationId: client.organization_id as string };
  }

  throw new Error('Forbidden');
}

async function findUserIdByEmail(
  service: ReturnType<typeof getServiceClient>,
  email: string,
): Promise<string | null> {
  const { data, error } = await service
    .from('profiles')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle();
  if (error) throw error;
  return (data?.id as string) || null;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { supabase, user } = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const type = body.type as MemberType;
    const email = String(body.email || '').trim().toLowerCase();
    const role = body.role as string | undefined;
    const clientId = body.clientId as string | undefined;

    if (!type || !email || !role) {
      return jsonResponse({ error: 'type, email, and role required' }, 400);
    }

    const service = getServiceClient();
    const org = await getOrganizationForUser(supabase, user.id);
    if (!org?.id) return jsonResponse({ error: 'Organization not found' }, 404);

    const userId = await findUserIdByEmail(service, email);
    if (!userId) {
      return jsonResponse({ added: false, reason: 'user_not_found' });
    }

    if (type === 'organization') {
      await assertCanManageTeam(service, user.id, org.id);

      const { data: member, error: memberErr } = await service
        .from('organization_members')
        .upsert(
          { organization_id: org.id, user_id: userId, role },
          { onConflict: 'organization_id,user_id' },
        )
        .select('*')
        .single();
      if (memberErr) throw memberErr;

      await service
        .from('organization_invites')
        .delete()
        .eq('organization_id', org.id)
        .ilike('email', email);

      return jsonResponse({ added: true, email, role, userId, member });
    }

    if (type === 'client') {
      if (!clientId) return jsonResponse({ error: 'clientId required' }, 400);
      await assertCanManageClient(service, user.id, clientId);

      const { data: member, error: memberErr } = await service
        .from('client_members')
        .upsert(
          { client_id: clientId, user_id: userId, role },
          { onConflict: 'client_id,user_id' },
        )
        .select('*')
        .single();
      if (memberErr) throw memberErr;

      await service
        .from('client_invites')
        .delete()
        .eq('client_id', clientId)
        .ilike('email', email);

      return jsonResponse({ added: true, email, role, userId, member, clientId });
    }

    return jsonResponse({ error: 'Invalid type' }, 400);
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Forbidden'
      ? 403
      : message === 'Unauthorized' || message === 'Missing authorization'
      ? 401
      : 500;
    return jsonResponse({ error: message }, status);
  }
});
