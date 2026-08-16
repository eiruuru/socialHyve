import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMembership } from '@/lib/membershipContext';
import { useClient } from '@/lib/clientContext';
import { hasCreativesQaAccess, hasGuestAccess } from '@/lib/clientRoles';

function isClientAllowedPath(pathname, membership) {
  if (pathname.includes('/login')) return true;
  if (pathname === '/app' || pathname === '/app/') return true;
  if (pathname === '/app/settings/account') return true;
  if (pathname === '/app/help') return true;

  const qaAccess = hasCreativesQaAccess(membership);
  const guestAccess = hasGuestAccess(membership);

  if (pathname.startsWith('/app/client/') && pathname.endsWith('/review')) {
    return qaAccess;
  }

  if (pathname === '/app/queue') return qaAccess;
  if (pathname === '/app/calendar') return qaAccess || guestAccess;
  if (/^\/app\/posts\/[^/]+$/.test(pathname)) return qaAccess || guestAccess;

  return false;
}

function getClientDefaultPath(membership) {
  if (hasCreativesQaAccess(membership)) {
    const clientId = membership.clientMemberships?.[0]?.clientId;
    return clientId ? `/app/client/${clientId}/review` : '/app/calendar';
  }
  return '/app/calendar';
}

export function ClientOnlyRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const membership = useMembership();
  const { isClientOnly, clientMemberships, loading } = membership;
  const { loading: clientsLoading } = useClient();

  useEffect(() => {
    if (loading || clientsLoading || !isClientOnly) return;

    const defaultPath = getClientDefaultPath(membership);

    if (!isClientAllowedPath(location.pathname, membership)) {
      navigate(defaultPath, { replace: true });
    }
  }, [membership, isClientOnly, clientMemberships, loading, clientsLoading, location.pathname, navigate]);

  return null;
}
