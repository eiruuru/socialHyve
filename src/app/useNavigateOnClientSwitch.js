import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClient } from '@/lib/clientContext';

/** Send the user to the calendar when they switch clients so client-scoped pages do not show stale data. */
export function useNavigateOnClientSwitch() {
  const navigate = useNavigate();
  const { activeClient } = useClient();
  const prevClientIdRef = useRef(null);

  useEffect(() => {
    const clientId = activeClient?.id;
    if (!clientId) return;

    if (prevClientIdRef.current && prevClientIdRef.current !== clientId) {
      navigate('/app/calendar', { replace: true });
    }
    prevClientIdRef.current = clientId;
  }, [activeClient?.id, navigate]);
}
