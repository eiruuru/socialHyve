import { Navigate } from 'react-router-dom';
import { useMembership } from '@/lib/membershipContext';

/** Legacy route — redirects to Account → Team tab (managers only). */
export default function TeamPage() {
  const { canManageTeam, loading } = useMembership();
  if (loading) return null;
  if (!canManageTeam) {
    return <Navigate to="/app/calendar" replace />;
  }
  return <Navigate to="/app/settings/account?tab=team" replace />;
}
