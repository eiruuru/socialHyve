import { supabase } from './supabase';
import { getActiveClientId } from './clientContext';

function mapAssignedAccount(row) {
  const account = row.social_accounts || row;
  return {
    ...account,
    is_primary: row.is_primary ?? account.is_primary ?? false,
    assignment_id: row.id,
  };
}

export async function listWorkspaceMetaSessions() {
  const { data, error } = await supabase
    .from('workspace_meta_sessions')
    .select('*')
    .order('meta_user_name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function listWorkspaceMetaPages({ sessionId } = {}) {
  let pagesQuery = supabase
    .from('social_accounts')
    .select('*')
    .order('name', { ascending: true });

  if (sessionId) pagesQuery = pagesQuery.eq('meta_session_id', sessionId);

  const { data: pages, error: pagesError } = await pagesQuery;
  if (pagesError) throw pagesError;

  const accountIds = (pages || []).map((page) => page.id);
  if (!accountIds.length) return [];

  const { data: assignments, error: assignmentsError } = await supabase
    .from('client_social_account_assignments')
    .select('id, social_account_id, client_id, is_primary')
    .in('social_account_id', accountIds);

  if (assignmentsError) throw assignmentsError;

  const clientIds = [...new Set((assignments || []).map((row) => row.client_id))];
  const clientsById = new Map();

  if (clientIds.length) {
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', clientIds);
    if (clientsError) throw clientsError;
    for (const client of clients || []) {
      clientsById.set(client.id, client);
    }
  }

  const assignmentsByAccountId = new Map(
    (assignments || []).map((row) => [row.social_account_id, row]),
  );

  return (pages || []).map((page) => {
    const assignment = assignmentsByAccountId.get(page.id);
    return {
      ...page,
      client_social_account_assignments: assignment
        ? [{
          ...assignment,
          clients: clientsById.get(assignment.client_id) || null,
        }]
        : [],
    };
  });
}

export async function listUnassignedMetaPages() {
  const pages = await listWorkspaceMetaPages();
  return pages.filter((page) => !(page.client_social_account_assignments || []).length);
}

export async function listSocialAccounts({ clientId } = {}) {
  const resolvedClientId = clientId ?? getActiveClientId();
  if (!resolvedClientId) return [];

  const { data, error } = await supabase
    .from('client_social_account_assignments')
    .select('id, is_primary, platform, social_accounts(*)')
    .eq('client_id', resolvedClientId);

  if (error) throw error;

  return (data || [])
    .map(mapAssignedAccount)
    .sort((a, b) => {
      if (Boolean(a.is_primary) !== Boolean(b.is_primary)) {
        return a.is_primary ? -1 : 1;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
}

export async function assignSocialAccountToClient(socialAccountId, clientId, { isPrimary = false } = {}) {
  const { data: account, error: accountErr } = await supabase
    .from('social_accounts')
    .select('id, platform')
    .eq('id', socialAccountId)
    .single();
  if (accountErr) throw accountErr;

  const { data: existingAssignment } = await supabase
    .from('client_social_account_assignments')
    .select('id, client_id')
    .eq('social_account_id', socialAccountId)
    .maybeSingle();

  if (existingAssignment && existingAssignment.client_id !== clientId) {
    throw new Error('This page is already assigned to another client.');
  }

  const { data, error } = await supabase
    .from('client_social_account_assignments')
    .upsert({
      client_id: clientId,
      social_account_id: socialAccountId,
      platform: account.platform,
      is_primary: isPrimary,
    }, { onConflict: 'social_account_id' })
    .select('id, is_primary, social_accounts(*)')
    .single();

  if (error) throw error;

  if (isPrimary) {
    await setPrimarySocialAccount(socialAccountId, { clientId, linkInstagram: account.platform === 'facebook' });
  }

  return mapAssignedAccount(data);
}

export function getPageAssignmentClientName(page) {
  const assignment = (page.client_social_account_assignments || [])[0];
  return assignment?.clients?.name || null;
}

export async function unassignSocialAccountFromClient(socialAccountId, clientId) {
  const { error } = await supabase
    .from('client_social_account_assignments')
    .delete()
    .eq('social_account_id', socialAccountId)
    .eq('client_id', clientId);
  if (error) throw error;
}

export async function unassignAllSocialAccounts({ clientId } = {}) {
  const resolvedClientId = clientId ?? getActiveClientId();
  if (!resolvedClientId) throw new Error('No active client selected');

  const { error } = await supabase
    .from('client_social_account_assignments')
    .delete()
    .eq('client_id', resolvedClientId);
  if (error) throw error;
}

export async function setPrimarySocialAccount(accountId, options = {}) {
  const clientId = options.clientId ?? getActiveClientId();

  const { data: assignment, error: fetchErr } = await supabase
    .from('client_social_account_assignments')
    .select('*, social_accounts(*)')
    .eq('social_account_id', accountId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!assignment) throw new Error('Account is not assigned to a client');
  if (clientId && assignment.client_id !== clientId) {
    throw new Error('Account does not belong to the active client');
  }

  const platform = assignment.platform || assignment.social_accounts?.platform;

  const { error: clearErr } = await supabase
    .from('client_social_account_assignments')
    .update({ is_primary: false })
    .eq('client_id', assignment.client_id)
    .eq('platform', platform);
  if (clearErr) throw clearErr;

  const { data: updated, error: setErr } = await supabase
    .from('client_social_account_assignments')
    .update({ is_primary: true })
    .eq('social_account_id', accountId)
    .select('id, is_primary, social_accounts(*)')
    .single();
  if (setErr) throw setErr;

  if (options.linkInstagram && platform === 'facebook') {
    const account = assignment.social_accounts;
    const allAccounts = await listSocialAccounts({ clientId: assignment.client_id });
    const hasIgPrimary = allAccounts.some((a) => a.platform === 'instagram' && a.is_primary);
    if (!hasIgPrimary && account?.page_id) {
      const linkedIg = allAccounts.find(
        (a) => a.platform === 'instagram' && a.page_id === account.page_id,
      );
      if (linkedIg) {
        await setPrimarySocialAccount(linkedIg.id, { linkInstagram: false, clientId: assignment.client_id });
      }
    }
  }

  return mapAssignedAccount(updated);
}

export async function disconnectMetaSession(sessionId) {
  const { data: accounts, error: accountsErr } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('meta_session_id', sessionId);
  if (accountsErr) throw accountsErr;

  const accountIds = (accounts || []).map((row) => row.id);
  if (accountIds.length) {
    await supabase.from('posts').update({ facebook_account_id: null }).in('facebook_account_id', accountIds);
    await supabase.from('posts').update({ instagram_account_id: null }).in('instagram_account_id', accountIds);
    await supabase.from('client_social_account_assignments').delete().in('social_account_id', accountIds);
    const { error: deleteAccountsErr } = await supabase.from('social_accounts').delete().in('id', accountIds);
    if (deleteAccountsErr) throw deleteAccountsErr;
  }

  const { error } = await supabase.from('workspace_meta_sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

// Backward-compatible aliases used by ConnectedAccountsPage
export async function disconnectSocialAccount(id, { clientId } = {}) {
  const resolvedClientId = clientId ?? getActiveClientId();
  await unassignSocialAccountFromClient(id, resolvedClientId);
}

export async function disconnectAllSocialAccounts({ clientId } = {}) {
  await unassignAllSocialAccounts({ clientId });
}
