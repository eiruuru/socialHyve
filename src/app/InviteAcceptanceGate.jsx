import { useEffect, useState } from 'react';
import { acceptInvite } from '@/lib/organization';
import {
  clearPendingInvite,
  loadPendingInvite,
} from '@/lib/membershipContext';
import { showToast } from '@/lib/toast';
import { EmptyHiveState } from '@/components/EmptyHiveState';

export function InviteAcceptanceGate({ children }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const pending = loadPendingInvite();
      if (!pending?.token || !pending?.type) {
        if (!cancelled) setChecking(false);
        return;
      }

      try {
        const result = await acceptInvite(pending.token, pending.type);
        clearPendingInvite();
        if (!cancelled && result?.redirectTo) {
          window.location.assign(result.redirectTo);
          return;
        }
      } catch (err) {
        console.error('Pending invite accept failed:', err);
        clearPendingInvite();
        if (!cancelled) {
          showToast({
            title: 'Could not complete invite',
            description: err.message,
            variant: 'error',
          });
        }
      }

      if (!cancelled) setChecking(false);
    }

    run();
    return () => { cancelled = true; };
  }, []);

  if (checking && loadPendingInvite()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <EmptyHiveState title="Accepting your invite…" compact />
      </div>
    );
  }

  return children;
}

export { savePendingInvite } from '@/lib/membershipContext';
