import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { getProfile } from '@/lib/profile';
import { useNotifications } from './useNotifications';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: getProfile,
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const notifications = useNotifications(profile);
  return (
    <NotificationsContext.Provider value={notifications}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return ctx;
}
