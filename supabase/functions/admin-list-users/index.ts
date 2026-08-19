import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { assertPlatformAdmin } from '../_shared/platformAdmin.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

type UserFilter = 'all' | 'team' | 'client_only' | 'owner' | 'must_change_password' | 'platform_admin';

function enrichUsers(
  profiles: Record<string, unknown>[],
  orgMembers: Record<string, unknown>[],
  clientMembers: Record<string, unknown>[],
  ownedOrgs: Record<string, unknown>[],
  adminSet: Set<string>,
) {
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

  return (profiles ?? []).map((profile) => {
    const organizationMemberships = orgByUser.get(profile.id as string) ?? [];
    const clientMemberships = clientByUser.get(profile.id as string) ?? [];
    const ownedOrganizations = ownedByUser.get(profile.id as string) ?? [];
    const isAdmin = adminSet.has(profile.id as string);
    const hasOrgMembership = organizationMemberships.length > 0 || ownedOrganizations.length > 0;
    const hasClientMembership = clientMemberships.length > 0;
    const isClientOnly = hasClientMembership && !hasOrgMembership;

    return {
      ...profile,
      organizationMemberships,
      clientMemberships,
      ownedOrganizations,
      isPlatformAdmin: isAdmin,
      isClientOnly,
      isOwner: ownedOrganizations.length > 0
        || organizationMemberships.some((m: { role?: string }) => m.role === 'owner'),
    };
  });
}

function applyFilters(
  users: ReturnType<typeof enrichUsers>,
  filter: UserFilter,
  organizationId?: string,
) {
  let filtered = users;

  if (organizationId) {
    filtered = filtered.filter((u) =>
      u.ownedOrganizations.some((o: { id?: string }) => o.id === organizationId)
      || u.organizationMemberships.some((m: { organization_id?: string }) => m.organization_id === organizationId),
    );
  }

  if (filter === 'team') {
    filtered = filtered.filter((u) =>
      u.organizationMemberships.length > 0 || u.ownedOrganizations.length > 0,
    );
  } else if (filter === 'client_only') {
    filtered = filtered.filter((u) => u.isClientOnly);
  } else if (filter === 'owner') {
    filtered = filtered.filter((u) => u.isOwner);
  } else if (filter === 'platform_admin') {
    filtered = filtered.filter((u) => u.isPlatformAdmin);
  }

  return filtered;
}

async function fetchMembershipData(
  service: ReturnType<typeof getServiceClient>,
  userIds: string[],
) {
  if (!userIds.length) {
    return { orgMembers: [], clientMembers: [], ownedOrgs: [], platformAdmins: [] };
  }

  const [{ data: orgMembers }, { data: clientMembers }, { data: ownedOrgs }, { data: platformAdmins }] =
    await Promise.all([
      service
        .from('organization_members')
        .select('user_id, role, organization_id, organizations(id, name)')
        .in('user_id', userIds),
      service
        .from('client_members')
        .select('user_id, role, client_id, clients(id, name)')
        .in('user_id', userIds),
      service
        .from('organizations')
        .select('id, name, owner_id')
        .in('owner_id', userIds),
      service
        .from('platform_admins')
        .select('user_id')
        .in('user_id', userIds),
    ]);

  return { orgMembers: orgMembers ?? [], clientMembers: clientMembers ?? [], ownedOrgs: ownedOrgs ?? [], platformAdmins: platformAdmins ?? [] };
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { user } = await requireUser(req);
    const service = getServiceClient();
    await assertPlatformAdmin(service, user.id);

    const body = await req.json().catch(() => ({}));
    const search = String(body.search || '').trim();
    const filter = (body.filter || 'all') as UserFilter;
    const organizationId = body.organizationId as string | undefined;
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
    const offset = Math.max(Number(body.offset) || 0, 0);

    const needsMemoryFilter = filter !== 'all' && filter !== 'must_change_password' || !!organizationId;

    let profileQuery = service
      .from('profiles')
      .select('id, email, full_name, must_change_password, updated_at', {
        count: needsMemoryFilter ? undefined : 'exact',
      })
      .order('updated_at', { ascending: false });

    if (search) {
      const pattern = `%${search.replace(/[%_]/g, '')}%`;
      profileQuery = profileQuery.or(`email.ilike.${pattern},full_name.ilike.${pattern}`);
    }

    if (filter === 'must_change_password') {
      profileQuery = profileQuery.eq('must_change_password', true);
    }

    if (needsMemoryFilter) {
      profileQuery = profileQuery.limit(500);
    } else {
      profileQuery = profileQuery.range(offset, offset + limit - 1);
    }

    const { data: profiles, error: profileErr, count } = await profileQuery;
    if (profileErr) throw profileErr;

    const userIds = (profiles ?? []).map((p) => p.id as string);
    const { orgMembers, clientMembers, ownedOrgs, platformAdmins } = await fetchMembershipData(service, userIds);
    const adminSet = new Set(platformAdmins.map((a) => a.user_id as string));

    let users = enrichUsers(profiles ?? [], orgMembers, clientMembers, ownedOrgs, adminSet);

    if (needsMemoryFilter) {
      users = applyFilters(users, filter, organizationId);
      const totalCount = users.length;
      users = users.slice(offset, offset + limit);
      return jsonResponse({ users, totalCount, limit, offset });
    }

    return jsonResponse({
      users,
      totalCount: count ?? users.length,
      limit,
      offset,
    });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Forbidden' ? 403
      : message === 'Unauthorized' || message === 'Missing authorization' ? 401
      : 400;
    return jsonResponse({ error: message }, status);
  }
});
