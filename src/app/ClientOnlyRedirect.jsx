import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMembership } from '@/lib/membershipContext';
import { useClient } from '@/lib/clientContext';

function isClientAllowedPath(pathname) {
  if (pathname.includes('/login')) return true;
  if (pathname === '/app/settings/account') return true;
  if (pathname === '/app/help') return true;
  return pathname.startsWith('/app/client/') && pathname.endsWith('/review');
}

export function ClientOnlyRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isClientOnly, clientMemberships, loading } = useMembership();
  const { loading: clientsLoading } = useClient();

  useEffect(() => {
    if (loading || clientsLoading || !isClientOnly) return;

    const reviewPath = `/app/client/${clientMemberships[0]?.clientId}/review`;

    if (!isClientAllowedPath(location.pathname) && clientMemberships[0]?.clientId) {
      navigate(reviewPath, { replace: true });
    }
  }, [isClientOnly, clientMemberships, loading, clientsLoading, location.pathname, navigate]);

  return null;
}
