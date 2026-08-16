import { Navigate } from 'react-router-dom';
import { useMembership } from '@/lib/membershipContext';

/** Legacy route — redirects to Account → Clients tab. */
export default function ClientsPage() {
  const { isOrgTeam, isClientOnly, loading } = useMembership();
  if (loading) return null;
  if (!isOrgTeam || isClientOnly) {
    return <Navigate to="/app/calendar" replace />;
  }
  return <Navigate to="/app/settings/account?tab=clients" replace />;
}
