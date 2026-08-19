import { Navigate, Outlet } from 'react-router-dom';
import { useMembership } from '@/lib/membershipContext';
import { EmptyHiveState } from '@/components/EmptyHiveState';

export function RequirePlatformAdmin() {
  const { isPlatformAdmin, loading } = useMembership();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <EmptyHiveState title="Loading admin…" compact />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/app/calendar" replace />;
  }

  return <Outlet />;
}
