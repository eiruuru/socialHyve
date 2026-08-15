import { supabase } from './supabase';

let _cachedWorkspace = null;
let _fetchPromise = null;

export function invalidateWorkspaceCache() {
  _cachedWorkspace = null;
  _fetchPromise = null;
}

export async function getWorkspace() {
  if (_cachedWorkspace) return _cachedWorkspace;
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: existing } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (existing) {
      _cachedWorkspace = existing;
      return existing;
    }

    const name = user.email?.split('@')[0] || 'My Workspace';
    const { data: created, error } = await supabase
      .from('workspaces')
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (error) throw error;
    _cachedWorkspace = created;

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .upsert({ id: created.id, name: created.name, owner_id: created.owner_id }, { onConflict: 'id' })
      .select()
      .single();
    if (!orgErr && org) {
      await supabase.from('organization_members').upsert(
        { organization_id: org.id, user_id: user.id, role: 'owner' },
        { onConflict: 'organization_id,user_id' },
      );
    }

    return created;
  })();

  try {
    return await _fetchPromise;
  } finally {
    _fetchPromise = null;
  }
}

export async function getCurrentWorkspaceId() {
  const ws = await getWorkspace();
  return ws?.id ?? null;
}

export async function stampWorkspaceId(data) {
  const workspaceId = await getCurrentWorkspaceId();
  return { ...data, workspace_id: workspaceId };
}
