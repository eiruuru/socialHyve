import { supabase } from './supabase';
import { CLIENT_ROLE } from './clientRoles';
import { invokeFunction } from './supabaseFunctions';
import { getBrowserTimezone } from './scheduleTime';

export async function previewInvite(token, type) {
  return invokeFunction('acceptInvite', { action: 'preview', token, type });
}

export async function acceptInvite(token, type) {
  return invokeFunction('acceptInvite', { action: 'accept', token, type });
}

export async function sendInviteEmail(payload) {
  return invokeFunction('sendInviteEmail', payload);
}

export async function getMembershipForUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: orgMember }, { data: clientMembers }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('client_members')
      .select('client_id, role, clients(id, name)')
      .eq('user_id', user.id),
  ]);

  let orgRole = orgMember?.role || null;
  if (!orgRole) {
    const { data: owned } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (owned) orgRole = 'owner';
  }

  return {
    orgRole,
    clientMemberships: (clientMembers || []).map((m) => ({
      clientId: m.client_id,
      role: m.role,
      name: m.clients?.name,
    })),
  };
}

export async function listClientsForUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // RLS scopes rows to every client this user can access (org team, manager, or client member).
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}


export function displayMember(member) {
  const profile = member?.profiles;
  if (profile?.full_name) return profile.full_name;
  if (profile?.email) return profile.email;
  const userId = member?.user_id;
  if (userId) return `Member …${userId.slice(-4)}`;
  return 'Unknown';
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';
}

async function uniqueSlug(orgId, baseSlug, excludeClientId = null) {
  let slug = baseSlug;
  let n = 2;
  for (;;) {
    let query = supabase
      .from('clients')
      .select('id')
      .eq('organization_id', orgId)
      .eq('slug', slug);
    if (excludeClientId) query = query.neq('id', excludeClientId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
}

async function ensureOwnerMembership(org, userId) {
  if (!org?.id || !userId || org.owner_id !== userId) return;

  const { data: existing } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', org.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from('organization_members').insert({
    organization_id: org.id,
    user_id: userId,
    role: 'owner',
  });
  if (error) throw error;
}

export async function getOrganization() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ownedOrgs } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  if (ownedOrgs?.length) {
    const org = ownedOrgs[0];
    await ensureOwnerMembership(org, user.id);
    return org;
  }

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const memberOrg = memberships?.find((m) => m.organizations)?.organizations;
  if (memberOrg) return memberOrg;

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  const ws = workspaces?.[0];
  if (!ws) return null;

  const { data: org, error } = await supabase
    .from('organizations')
    .upsert({ id: ws.id, name: ws.name, owner_id: ws.owner_id }, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  await ensureOwnerMembership(org, user.id);
  return org;
}

export async function listClients() {
  return listClientsForUser();
}

export async function createClient(name) {
  const timezone = getBrowserTimezone();
  const { data, error } = await supabase.rpc('create_client', {
    p_name: name,
    p_timezone: timezone,
  });

  if (!error && data) return data;

  // Fallback when migration 013 is not applied yet.
  if (error?.code !== 'PGRST202') throw error;

  const org = await getOrganization();
  if (!org) throw new Error('No organization');

  const baseSlug = slugify(name);
  const slug = await uniqueSlug(org.id, baseSlug);
  const { data: inserted, error: insertError } = await supabase
    .from('clients')
    .insert({
      organization_id: org.id,
      name,
      slug,
      default_timezone: timezone,
    })
    .select()
    .single();
  if (insertError) throw insertError;
  return inserted;
}

export async function listOrganizationMembers() {
  const org = await getOrganization();
  if (!org) return [];

  const { data, error } = await supabase
    .from('organization_members')
    .select('*, profiles(id, email, full_name)')
    .eq('organization_id', org.id);
  if (error) throw error;
  return data;
}

export async function listClientMembers(clientId) {
  const { data, error } = await supabase
    .from('client_members')
    .select('*, profiles(id, email, full_name)')
    .eq('client_id', clientId);
  if (error) throw error;
  return data;
}

export async function inviteClientMember(clientId, email, role = CLIENT_ROLE.APPROVER) {
  const normalizedEmail = email.trim().toLowerCase();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('client_invites')
    .insert({ client_id: clientId, email: normalizedEmail, role, token, expires_at: expiresAt })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addClientMember(clientId, userId, role = CLIENT_ROLE.APPROVER) {
  const { data, error } = await supabase
    .from('client_members')
    .upsert({ client_id: clientId, user_id: userId, role }, { onConflict: 'client_id,user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function inviteOrganizationMember(email, role = 'editor') {
  const org = await getOrganization();
  if (!org) throw new Error('No organization');
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('organization_invites')
    .insert({ organization_id: org.id, email, role, token, expires_at: expiresAt })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(clientId, updates) {
  const org = await getOrganization();
  if (!org) throw new Error('No organization');

  const payload = { ...updates };
  if (updates.name) {
    payload.slug = await uniqueSlug(org.id, slugify(updates.name), clientId);
  }

  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', clientId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClient(clientId) {
  const { error } = await supabase.from('clients').delete().eq('id', clientId);
  if (error) throw error;
}

export async function listOrganizationInvites() {
  const org = await getOrganization();
  if (!org) return [];
  const { data, error } = await supabase
    .from('organization_invites')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listClientInvites(clientId) {
  const { data, error } = await supabase
    .from('client_invites')
    .select('*')
    .eq('client_id', clientId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function removeClientMember(clientId, userId) {
  const { error } = await supabase
    .from('client_members')
    .delete()
    .eq('client_id', clientId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateClientMemberRole(clientId, userId, role) {
  if (!Object.values(CLIENT_ROLE).includes(role)) {
    throw new Error('Invalid role');
  }

  const membership = await getMembershipForUser();
  const actorOrgRole = membership?.orgRole;
  if (actorOrgRole !== 'owner' && actorOrgRole !== 'admin') {
    throw new Error('Only owners and admins can change roles');
  }

  const { data, error } = await supabase
    .from('client_members')
    .update({ role })
    .eq('client_id', clientId)
    .eq('user_id', userId)
    .select('*, profiles(id, email, full_name)')
    .single();
  if (error) throw error;
  return data;
}

export async function revokeClientInvite(inviteId) {
  const { error } = await supabase
    .from('client_invites')
    .delete()
    .eq('id', inviteId);
  if (error) throw error;
}

export async function listMyPendingClientInvites() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];

  const email = user.email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('client_invites')
    .select('*, clients(id, name)')
    .eq('email', email)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listMyPendingOrganizationInvites() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];

  const email = user.email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('organization_invites')
    .select('*, organizations(id, name)')
    .eq('email', email)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function declineClientInvite(inviteId) {
  const { error } = await supabase
    .from('client_invites')
    .delete()
    .eq('id', inviteId);
  if (error) throw error;
}

export function buildClientInviteLink(token) {
  return `${window.location.origin}/app/login?clientInvite=${token}`;
}

export function buildOrganizationInviteLink(token) {
  return `${window.location.origin}/app/login?invite=${token}`;
}

export async function resendClientInviteReminder(inviteId) {
  const { data, error } = await supabase
    .from('client_invites')
    .update({ reminded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .select('*, clients(id, name)')
    .single();
  if (error) throw error;
  return data;
}

export async function listOrganizationManagers() {
  const org = await getOrganization();
  if (!org) return [];

  const { data, error } = await supabase
    .from('organization_members')
    .select('*, profiles(id, email, full_name)')
    .eq('organization_id', org.id)
    .eq('role', 'manager');
  if (error) throw error;
  return data;
}

export async function listClientManagers(clientId) {
  const { data, error } = await supabase
    .from('manager_client_assignments')
    .select('*, profiles(id, email, full_name)')
    .eq('client_id', clientId);
  if (error) throw error;
  return data;
}

export async function assignManagerToClient(clientId, userId) {
  const { data, error } = await supabase
    .from('manager_client_assignments')
    .upsert({ client_id: clientId, user_id: userId }, { onConflict: 'user_id,client_id' })
    .select('*, profiles(id, email, full_name)')
    .single();
  if (error) throw error;
  return data;
}

export async function removeManagerFromClient(clientId, userId) {
  const { error } = await supabase
    .from('manager_client_assignments')
    .delete()
    .eq('client_id', clientId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function revokeOrganizationInvite(inviteId) {
  const { error } = await supabase.from('organization_invites').delete().eq('id', inviteId);
  if (error) throw error;
}

export async function removeOrganizationMember(userId) {
  const org = await getOrganization();
  if (!org) throw new Error('No organization');
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === userId) throw new Error('You cannot remove yourself');
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', org.id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateOrganizationMemberRole(userId, role, { currentRole } = {}) {
  const org = await getOrganization();
  if (!org) throw new Error('No organization');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const membership = await getMembershipForUser();
  const actorOrgRole = membership?.orgRole;
  if (actorOrgRole !== 'owner' && actorOrgRole !== 'admin') {
    throw new Error('Only owners and admins can change roles');
  }
  if (userId === user.id) {
    throw new Error('You cannot change your own role');
  }

  const allowedRoles = ['owner', 'admin', 'editor', 'manager'];
  if (!allowedRoles.includes(role)) {
    throw new Error('Invalid role');
  }

  let existingRole = currentRole;
  if (!existingRole) {
    const { data: existing } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', org.id)
      .eq('user_id', userId)
      .maybeSingle();
    existingRole = existing?.role;
  }

  if ((role === 'owner' || existingRole === 'owner') && actorOrgRole !== 'owner') {
    throw new Error('Only the organization owner can change the owner role');
  }

  const { data, error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('organization_id', org.id)
    .eq('user_id', userId)
    .select('*, profiles(id, email, full_name)')
    .single();
  if (error) throw error;
  return data;
}

export const ORG_ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner', ownerOnly: true },
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'manager', label: 'Manager' },
];

export function getAssignableOrgRoleOptions(actorOrgRole) {
  return ORG_ROLE_OPTIONS.filter((option) => !option.ownerOnly || actorOrgRole === 'owner');
}

export function canChangeOrganizationMemberRole({ actorOrgRole, actorUserId, targetMember }) {
  if (actorOrgRole !== 'owner' && actorOrgRole !== 'admin') return false;
  if (targetMember.user_id === actorUserId) return false;
  if (targetMember.role === 'owner' && actorOrgRole !== 'owner') return false;
  return true;
}

export function canChangeClientMemberRole(actorOrgRole) {
  return actorOrgRole === 'owner' || actorOrgRole === 'admin';
}

export async function updateOrganizationSettings(updates) {
  const org = await getOrganization();
  if (!org) throw new Error('No organization');

  const { data, error } = await supabase
    .from('organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', org.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listWorkflowApproverUserIds() {
  const org = await getOrganization();
  if (!org) return [];

  const { data: members, error } = await supabase
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', org.id)
    .in('role', ['owner', 'admin', 'manager']);
  if (error) throw error;

  const ids = new Set((members || []).map((m) => m.user_id));
  if (org.owner_id) ids.add(org.owner_id);
  return [...ids];
}
