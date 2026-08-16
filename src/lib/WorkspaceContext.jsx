import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getOrganization } from './organization';
import { getWorkspace, invalidateWorkspaceCache } from './workspace';

const WorkspaceContext = createContext(null);

async function loadWorkspaceSnapshot() {
  const org = await getOrganization();
  if (org) {
    return { id: org.id, name: org.name, owner_id: org.owner_id };
  }
  return getWorkspace();
}

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspace = useCallback(async () => {
    invalidateWorkspaceCache();
    const next = await loadWorkspaceSnapshot();
    setWorkspace(next);
    return next;
  }, []);

  useEffect(() => {
    loadWorkspaceSnapshot()
      .then(setWorkspace)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspace, loading, refreshWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
