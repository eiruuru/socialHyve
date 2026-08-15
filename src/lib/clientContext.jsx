import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { listClients, getOrganization } from './organization';

const STORAGE_KEY = 'socialhyve_active_client';

const ClientContext = createContext(null);

export function ClientProvider({ children }) {
  const [organization, setOrganization] = useState(null);
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClientState] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [org, clientList] = await Promise.all([getOrganization(), listClients()]);
    setOrganization(org);
    setClients(clientList);

    const savedId = localStorage.getItem(STORAGE_KEY);
    const saved = clientList.find((c) => c.id === savedId);
    const next = saved || clientList[0] || null;
    setActiveClientState(next);
    if (next) localStorage.setItem(STORAGE_KEY, next.id);
  }, []);

  useEffect(() => {
    refresh().catch(console.error).finally(() => setLoading(false));
  }, [refresh]);

  const setActiveClient = (client) => {
    setActiveClientState(client);
    if (client) localStorage.setItem(STORAGE_KEY, client.id);
  };

  return (
    <ClientContext.Provider
      value={{
        organization,
        clients,
        activeClient,
        setActiveClient,
        refreshClients: refresh,
        loading,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within ClientProvider');
  return ctx;
}

export function useOptionalClient() {
  return useContext(ClientContext);
}

export function getActiveClientId() {
  return localStorage.getItem(STORAGE_KEY);
}
