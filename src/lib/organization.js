import { supabase } from './supabase';

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

  if (owned) return owned;

  // Bootstrap from legacy workspace
  const { data: ws } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!ws) return null;

  const { data: org } = await supabase
    .from('organizations')
    .upsert({ id: ws.id, name: ws.name, owner_id: ws.owner_id }, { onConflict: 'id' })
    .select()
    .single();

  return org;
}

export async function listClients() {
  const org = await getOrganization();
  if (!org) return [];

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', org.id)
    .order('name');
  if (error) throw error;
  return data;
}

export async function createClient(name) {
  const org = await getOrganization();
  if (!org) throw new Error('No organization');

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';
  const { data, error } = await supabase
    .from('clients')
    .insert({ organization_id: org.id, name, slug })
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
    .select('*')
    .eq('organization_id', org.id);
  if (error) throw error;
  return data;
}

export async function listClientMembers(clientId) {
  const { data, error } = await supabase
    .from('client_members')
    .select('*')
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
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .select()
    .single();
  if (error) throw error;
  return data;
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
