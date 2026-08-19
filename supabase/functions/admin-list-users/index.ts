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

    const { data: profiles, error: profileErr } = await service
      .from('profiles')
      .select('id, email, full_name, must_change_password, updated_at')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (profileErr) throw profileErr;

    const userIds = (profiles ?? []).map((p) => p.id);

    const [{ data: orgMembers }, { data: clientMembers }, { data: ownedOrgs }] = await Promise.all([
      userIds.length
        ? service
          .from('organization_members')
          .select('user_id, role, organization_id, organizations(id, name)')
          .in('user_id', userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? service
          .from('client_members')
          .select('user_id, role, client_id, clients(id, name)')
          .in('user_id', userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? service
          .from('organizations')
          .select('id, name, owner_id')
          .in('owner_id', userIds)
        : Promise.resolve({ data: [] }),
    ]);

    const orgByUser = new Map<string, unknown[]>();
    for (const row of orgMembers ?? []) {
      const list = orgByUser.get(row.user_id as string) ?? [];
      list.push(row);
      orgByUser.set(row.user_id as string, list);
    }

    const clientByUser = new Map<string, unknown[]>();
    for (const row of clientMembers ?? []) {
      const list = clientByUser.get(row.user_id as string) ?? [];
      list.push(row);
      clientByUser.set(row.user_id as string, list);
    }

    const ownedByUser = new Map<string, unknown[]>();
    for (const row of ownedOrgs ?? []) {
      const list = ownedByUser.get(row.owner_id as string) ?? [];
      list.push(row);
      ownedByUser.set(row.owner_id as string, list);
    }

    const users = (profiles ?? []).map((profile) => ({
      ...profile,
      organizationMemberships: orgByUser.get(profile.id) ?? [],
      clientMemberships: clientByUser.get(profile.id) ?? [],
      ownedOrganizations: ownedByUser.get(profile.id) ?? [],
    }));

    return jsonResponse({ users });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Forbidden' ? 403
      : message === 'Unauthorized' || message === 'Missing authorization' ? 401
      : 400;
    return jsonResponse({ error: message }, status);
  }
});
