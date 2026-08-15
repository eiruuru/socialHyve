import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMembership } from '@/lib/membershipContext';
import { useClient } from '@/lib/clientContext';

export function ClientOnlyRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isClientOnly, clientMemberships, loading } = useMembership();
  const { loading: clientsLoading } = useClient();

  useEffect(() => {
    if (loading || clientsLoading || !isClientOnly) return;

    const reviewPath = `/app/client/${clientMemberships[0]?.clientId}/review`;
    const onReview = location.pathname.startsWith('/app/client/') && location.pathname.endsWith('/review');
    const onLogin = location.pathname.includes('/login');

    if (!onReview && !onLogin && clientMemberships[0]?.clientId) {
      navigate(reviewPath, { replace: true });
    }
  }, [isClientOnly, clientMemberships, loading, clientsLoading, location.pathname, navigate]);

  return null;
}
