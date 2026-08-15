import { supabase } from './supabase';
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

  const org = await getOrganization();
  if (org) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', org.id)
      .order('name');
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('client_members')
    .select('clients(*)')
    .eq('user_id', user.id);
  if (error) throw error;
  return (data || []).map((row) => row.clients).filter(Boolean);
}


export function displayMember(member) {
  const profile = member?.profiles;
  if (profile?.full_name) return profile.full_name;
  if (profile?.email) return profile.email;
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

async function ensureOrganizationSetup(org, userId) {
  if (!org?.id || !userId) return;

  await supabase.from('organization_members').upsert(
    { organization_id: org.id, user_id: userId, role: 'owner' },
    { onConflict: 'organization_id,user_id' },
  );
}

export async function getOrganization() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(*)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (member?.organizations) return member.organizations;

  const { data: owned } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (owned) {
    await ensureOrganizationSetup(owned, user.id);
    return owned;
  }

  const { data: ws } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!ws) return null;

  const { data: org, error } = await supabase
    .from('organizations')
    .upsert({ id: ws.id, name: ws.name, owner_id: ws.owner_id }, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  await ensureOrganizationSetup(org, user.id);
  return org;
}

export async function listClients() {
  return listClientsForUser();
}

export async function createClient(name) {
  const org = await getOrganization();
  if (!org) throw new Error('No organization');

  const baseSlug = slugify(name);
  const slug = await uniqueSlug(org.id, baseSlug);
  const { data, error } = await supabase
    .from('clients')
    .insert({
      organization_id: org.id,
      name,
      slug,
      default_timezone: getBrowserTimezone(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
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

export async function inviteClientMember(clientId, email, role = 'approver') {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('client_invites')
    .insert({ client_id: clientId, email, role, token, expires_at: expiresAt })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addClientMember(clientId, userId, role = 'approver') {
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
    .order('created_at', { ascending: false });
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
