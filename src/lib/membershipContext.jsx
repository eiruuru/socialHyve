import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { bootstrapPlatformAdmin } from './admin';
import {
  canUseCanva as planCanUseCanva,
  canUseClientMembers as planCanUseClientMembers,
  canUseTeamFeatures as planCanUseTeamFeatures,
  isProPlan,
  isActiveSubscription,
} from './plans';

const MembershipContext = createContext(null);

export const PENDING_INVITE_KEY = 'socialhyve_pending_invite';
const PENDING_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function savePendingInvite(type, token) {
  const payload = {
    type,
    token,
    savedAt: Date.now(),
  };
  window.localStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(payload));
  window.sessionStorage.removeItem(PENDING_INVITE_KEY);
}

export function loadPendingInvite() {
  try {
    const raw = window.localStorage.getItem(PENDING_INVITE_KEY)
      || window.sessionStorage.getItem(PENDING_INVITE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.type) return null;

    const savedAt = parsed.savedAt || 0;
    if (savedAt && Date.now() - savedAt > PENDING_INVITE_TTL_MS) {
      clearPendingInvite();
      return null;
    }

    if (!parsed.savedAt) {
      savePendingInvite(parsed.type, parsed.token);
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  window.localStorage.removeItem(PENDING_INVITE_KEY);
  window.sessionStorage.removeItem(PENDING_INVITE_KEY);
}

function deriveCapabilities(orgRole, clientMemberships, billing = {}) {
  const isClientOnly = !orgRole && clientMemberships.length > 0;
  const isOwnerOrAdmin = orgRole === 'owner' || orgRole === 'admin';
  const isManager = orgRole === 'manager';
  const isOrgTeam = !!orgRole;

  const plan = billing.plan ?? null;
  const subscriptionStatus = billing.subscription_status ?? 'none';
  const hasActivePlan = isActiveSubscription(subscriptionStatus);
  const isPro = isProPlan(plan, subscriptionStatus);
  const canUseTeam = planCanUseTeamFeatures(plan, subscriptionStatus);
  const canUseClientMembers = planCanUseClientMembers(plan, subscriptionStatus);
  const canUseCanva = planCanUseCanva(plan, subscriptionStatus);

  return {
    orgRole,
    organizationId: billing.organizationId ?? null,
    clientMemberships,
    isClientOnly,
    isOrgTeam,
    isManager,
    isOwnerOrAdmin,
    canManageTeam: isOwnerOrAdmin,
    canManageClients: isOwnerOrAdmin || orgRole === 'editor',
    canAssignManagers: isOwnerOrAdmin && canUseTeam,
    plan,
    subscriptionStatus,
    hasActivePlan,
    isPro,
    canUseTeam,
    canUseClientMembers,
    canUseCanva,
    isPlatformAdmin: billing.isPlatformAdmin ?? false,
    roleLabel: isClientOnly
      ? clientMemberships[0]?.role || 'client'
      : orgRole || null,
  };
}

export function MembershipProvider({ children }) {
  const [membership, setMembership] = useState(() => deriveCapabilities(null, []));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMembership(deriveCapabilities(null, []));
      setLoading(false);
      return;
    }

    const [{ data: orgMembers }, { data: ownedOrgs }, { data: clientMembers }] = await Promise.all([
      supabase
        .from('organization_members')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1),
      supabase
        .from('client_members')
        .select('client_id, role, clients(id, name)')
        .eq('user_id', user.id),
    ]);

    let orgRole = orgMembers?.find((m) => m.role === 'owner')?.role
      || orgMembers?.[0]?.role
      || null;
    let organizationId = orgMembers?.find((m) => m.role === 'owner')?.organization_id
      || orgMembers?.[0]?.organization_id
      || null;

    if (!orgRole && ownedOrgs?.length) {
      orgRole = 'owner';
      organizationId = ownedOrgs[0].id;
    }

    let billing = { organizationId, isPlatformAdmin: false };
    if (organizationId) {
      const { data: orgBilling } = await supabase
        .from('organizations')
        .select('id, plan, subscription_status, subscription_current_period_end')
        .eq('id', organizationId)
        .maybeSingle();
      if (orgBilling) {
        billing = {
          organizationId: orgBilling.id,
          plan: orgBilling.plan,
          subscription_status: orgBilling.subscription_status,
          subscription_current_period_end: orgBilling.subscription_current_period_end,
          isPlatformAdmin: false,
        };
      }
    }

    try {
      await bootstrapPlatformAdmin();
    } catch {
      // ignore bootstrap errors
    }

    const { data: adminRow } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    billing.isPlatformAdmin = !!adminRow;

    const clientMemberships = (clientMembers || []).map((m) => ({
      clientId: m.client_id,
      role: m.role,
      name: m.clients?.name,
    }));

    setMembership(deriveCapabilities(orgRole, clientMemberships, billing));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const value = useMemo(
    () => ({ ...membership, loading, refreshMembership: refresh }),
    [membership, loading, refresh],
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
      organizationId: null,
      clientMemberships: [],
      isClientOnly: false,
      isOrgTeam: false,
      isManager: false,
      canManageTeam: false,
      canManageClients: false,
      canAssignManagers: false,
      isOwnerOrAdmin: false,
      plan: null,
      subscriptionStatus: 'none',
      hasActivePlan: false,
      isPro: false,
      canUseTeam: false,
      canUseClientMembers: false,
      canUseCanva: false,
      isPlatformAdmin: false,
      roleLabel: null,
      loading: false,
      refreshMembership: async () => {},
    };
  }
  return ctx;
}
