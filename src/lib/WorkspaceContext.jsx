import { createContext, useContext, useEffect, useState } from 'react';
import { getWorkspace } from './workspace';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkspace()
      .then(setWorkspace)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspace, loading, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
