import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from './supabase';

const MembershipContext = createContext(null);

export const PENDING_INVITE_KEY = 'socialhyve_pending_invite';

export function savePendingInvite(type, token) {
  window.sessionStorage.setItem(PENDING_INVITE_KEY, JSON.stringify({ type, token }));
}

export function loadPendingInvite() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_INVITE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  window.sessionStorage.removeItem(PENDING_INVITE_KEY);
}

function deriveCapabilities(orgRole, clientMemberships) {
  const isClientOnly = !orgRole && clientMemberships.length > 0;
  const isOwnerOrAdmin = orgRole === 'owner' || orgRole === 'admin';
  const isManager = orgRole === 'manager';
  const isOrgTeam = !!orgRole;

  return {
    orgRole,
    clientMemberships,
    isClientOnly,
    isOrgTeam,
    isManager,
    canManageTeam: isOwnerOrAdmin,
    canManageClients: isOwnerOrAdmin || orgRole === 'editor',
    canAssignManagers: isOwnerOrAdmin,
    roleLabel: isClientOnly
      ? clientMemberships[0]?.role || 'client'
      : orgRole || null,
  };
}

export function MembershipProvider({ children }) {
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMembership(deriveCapabilities(null, []));
      setLoading(false);
      return;
    }

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

    const clientMemberships = (clientMembers || []).map((m) => ({
      clientId: m.client_id,
      role: m.role,
      name: m.clients?.name,
    }));

    setMembership(deriveCapabilities(orgRole, clientMemberships));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const value = useMemo(
    () => ({ ...membership, loading, refreshMembership: refresh }),
    [membership, loading, refresh]
  );

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const ctx = useContext(MembershipContext);
  if (!ctx) {
    return {
      orgRole: null,
      clientMemberships: [],
      isClientOnly: false,
      isOrgTeam: false,
      isManager: false,
      canManageTeam: false,
      canManageClients: false,
      canAssignManagers: false,
      roleLabel: null,
      loading: false,
      refreshMembership: async () => {},
    };
  }
  return ctx;
}
