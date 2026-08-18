import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  buildTimezoneEntry,
  buildTimezoneSelectOptions,
  filterTimezoneOptions,
  formatTimezoneOptionLabel,
  getBrowserTimezone,
  groupTimezoneOptions,
} from '@/lib/timezoneOptions';

function TimezoneOptionButton({ entry, active, onSelect, hint }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onSelect(entry.value)}
      className={cn(
        'flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100',
        active && 'bg-honey-light/40',
      )}
    >
      <span className="font-medium text-ink">
        {entry.city}
        {entry.country && entry.city !== entry.country ? `, ${entry.country}` : ''}
      </span>
      <span className="text-xs text-muted-foreground">
        {hint ? `${hint} · ${entry.offset}` : entry.offset}
      </span>
    </button>
  );
}

export function TimezoneSelect({
  value,
  onChange,
  className,
  id,
  workspaceDefault,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const selectedItemRef = useRef(null);
  const generatedId = useId();
  const inputId = id || generatedId;

  const browserTz = getBrowserTimezone();
  const selected = value || workspaceDefault || browserTz;

  const options = useMemo(
    () => buildTimezoneSelectOptions({
      browserTz,
      workspaceDefault,
      includeValue: selected,
    }),
    [browserTz, workspaceDefault, selected],
  );

  const filtered = useMemo(
    () => filterTimezoneOptions(options, search),
    [options, search],
  );

  const grouped = useMemo(() => groupTimezoneOptions(filtered), [filtered]);

  const pinnedBrowser = !search.trim() && browserTz
    ? buildTimezoneEntry(browserTz)
    : null;
  const pinnedWorkspace = !search.trim() && workspaceDefault && workspaceDefault !== browserTz
    ? buildTimezoneEntry(workspaceDefault)
    : null;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current?.contains(event.target)) return;
      setOpen(false);
      setSearch('');
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || search.trim() || !selectedItemRef.current) return undefined;
    const timer = window.setTimeout(() => {
      selectedItemRef.current?.scrollIntoView({ block: 'nearest' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, search, selected]);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        id={inputId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="truncate">{formatTimezoneOptionLabel(selected)}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[min(100%,22rem)] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg">
          <div className="border-b border-neutral-200 p-2">
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city, country, or time zone…"
              aria-label="Search time zones"
            />
          </div>

          <ul role="listbox" aria-labelledby={inputId} className="max-h-72 overflow-y-auto py-1">
            {pinnedBrowser && (
              <li>
                <TimezoneOptionButton
                  entry={pinnedBrowser}
                  active={selected === pinnedBrowser.value}
                  onSelect={handleSelect}
                  hint="Your location"
                />
              </li>
            )}

            {pinnedWorkspace && (
              <li>
                <TimezoneOptionButton
                  entry={pinnedWorkspace}
                  active={selected === pinnedWorkspace.value}
                  onSelect={handleSelect}
                  hint="Workspace default"
                />
              </li>
            )}

            {(pinnedBrowser || pinnedWorkspace) && grouped.length > 0 && (
              <li aria-hidden className="my-1 border-t border-neutral-100" />
            )}

            {grouped.map(({ region, entries }) => (
              <li key={region}>
                <p className="sticky top-0 bg-neutral-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  {region}
                </p>
                <ul>
                  {entries.map((entry) => {
                    const isSelected = selected === entry.value;
                    const isPinned = entry.value === browserTz || entry.value === workspaceDefault;
                    if (!search.trim() && isPinned) return null;

                    return (
                      <li key={entry.value} ref={isSelected ? selectedItemRef : undefined}>
                        <TimezoneOptionButton
                          entry={entry}
                          active={isSelected}
                          onSelect={handleSelect}
                        />
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}

            {!grouped.length && (
              <li className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                No time zones match your search.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
