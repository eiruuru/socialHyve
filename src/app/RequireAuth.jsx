import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { InviteAcceptanceGate } from './InviteAcceptanceGate';
import { WelcomePasswordChangeDialog } from '@/components/auth/WelcomePasswordChangeDialog';
import { getProfileMustChangePassword } from '@/lib/admin';

export function RequireAuth() {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [passwordCheckDone, setPasswordCheckDone] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || isLoadingAuth) {
      setPasswordCheckDone(false);
      setMustChangePassword(false);
      return;
    }

    getProfileMustChangePassword()
      .then(setMustChangePassword)
      .catch(() => setMustChangePassword(false))
      .finally(() => setPasswordCheckDone(true));
  }, [isAuthenticated, isLoadingAuth, user?.id]);

  if (isLoadingAuth || (isAuthenticated && !passwordCheckDone)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <EmptyHiveState title="Loading the hive…" compact />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/app/login" replace />;
  }

  return (
    <>
      <WelcomePasswordChangeDialog
        open={mustChangePassword}
        email={user?.email}
        onComplete={() => setMustChangePassword(false)}
      />
      {!mustChangePassword ? (
        <InviteAcceptanceGate>
          <Outlet />
        </InviteAcceptanceGate>
      ) : null}
    </>
  );
}
