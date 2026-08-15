import { ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useClient } from '@/lib/clientContext';
import { cn } from '@/lib/utils';

export function ClientSwitcher({ className }) {
  const queryClient = useQueryClient();
  const { clients, activeClient, setActiveClient, loading } = useClient();

  if (loading) {
    return <div className={cn('h-9 animate-pulse rounded-hyve-sm bg-sidebar-accent', className)} />;
  }

  if (!clients.length) {
    return (
      <p className={cn('text-xs text-neutral-400', className)}>No clients yet</p>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <label className="sr-only" htmlFor="client-switcher">Active client</label>
      <div className="relative">
        <select
          id="client-switcher"
          value={activeClient?.id || ''}
          onChange={(e) => {
            const next = clients.find((c) => c.id === e.target.value);
            if (next) {
              setActiveClient(next);
              queryClient.invalidateQueries();
            }
          }}
          className="w-full appearance-none rounded-hyve-sm border border-sidebar-border bg-sidebar-accent py-2 pl-3 pr-8 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-honey"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      </div>
    </div>
  );
}
