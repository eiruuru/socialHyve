import { useEffect, useRef, useState } from 'react';
import { Building2, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useClient } from '@/lib/clientContext';
import { cn } from '@/lib/utils';

export function HeaderClientSwitcher({ className }) {
  const queryClient = useQueryClient();
  const { clients, activeClient, setActiveClient, loading } = useClient();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  if (loading) {
    return (
      <div
        className={cn('h-9 w-9 animate-pulse rounded-hyve-sm bg-sidebar-accent', className)}
        aria-hidden
      />
    );
  }

  if (!clients.length) return null;

  const activeName = activeClient?.name || 'Client';

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-hyve-sm px-2 text-neutral-200 transition-colors hover:bg-sidebar-accent hover:text-white sm:min-w-0 sm:px-3"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Active client: ${activeName}. Switch client.`}
        title={activeName}
      >
        <Building2 className="h-5 w-5 shrink-0" />
        <span className="hidden max-w-[7rem] truncate text-xs font-medium sm:inline">
          {activeName}
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Switch client"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-64 overflow-hidden rounded-hyve-md border border-neutral-200 bg-white shadow-hyve-lg"
        >
          <div className="border-b border-neutral-100 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Active client
            </p>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {clients.map((client) => {
              const selected = client.id === activeClient?.id;
              return (
                <li key={client.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors',
                      selected
                        ? 'bg-honey-light/40 text-ink'
                        : 'text-neutral-700 hover:bg-neutral-50',
                    )}
                    onClick={() => {
                      setActiveClient(client);
                      queryClient.invalidateQueries();
                      setOpen(false);
                    }}
                  >
                    <span className="truncate font-medium">{client.name}</span>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-honey-dark" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
