import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { listClients, getOrganization } from './organization';
import { supabase } from './supabase';

const STORAGE_KEY = 'socialhyve_active_client';

async function loadAccessibleClients() {
  const clientList = await listClients();
  if (clientList.length) return clientList;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('client_members')
    .select('clients(*)')
    .eq('user_id', user.id);
  if (error) throw error;

  return (data || [])
    .map((row) => row.clients)
    .filter(Boolean)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

const ClientContext = createContext(null);

export function ClientProvider({ children }) {
  const [organization, setOrganization] = useState(null);
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClientState] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [org, clientList] = await Promise.all([getOrganization(), loadAccessibleClients()]);
    setOrganization(org);
    setClients(clientList);

    const savedId = localStorage.getItem(STORAGE_KEY);
    const saved = clientList.find((c) => c.id === savedId);
    const next = saved || clientList[0] || null;
    setActiveClientState(next);
    if (next) {
      localStorage.setItem(STORAGE_KEY, next.id);
    } else if (savedId) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    refresh().catch(console.error).finally(() => setLoading(false));
  }, [refresh]);

  const setActiveClient = (client) => {
    setActiveClientState(client);
    if (client) {
      localStorage.setItem(STORAGE_KEY, client.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
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
