import { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { cn } from '@/lib/utils';

export function LocationSearchField({
  locationId,
  locationName,
  onChange,
  instagramAccountId,
  className,
}) {
  const [query, setQuery] = useState(locationName || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setQuery(locationName || '');
  }, [locationName]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!instagramAccountId || query.trim().length < 2 || query === locationName) {
      setResults([]);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await invokeFunction('metaSearchLocations', {
          query: query.trim(),
          instagramAccountId,
        });
        setResults(data?.locations || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, instagramAccountId, locationName]);

  const selectLocation = (location) => {
    onChange({ location_id: location.id, location_name: location.name });
    setQuery(location.name);
    setOpen(false);
  };

  const clearLocation = () => {
    onChange({ location_id: '', location_name: '' });
    setQuery('');
    setResults([]);
  };

  return (
    <div className={cn('relative space-y-1.5', className)} ref={containerRef}>
      <label className="block text-xs font-medium">Location</label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) clearLocation();
          }}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search for a place…"
          className="pl-8 pr-8"
        />
        {(locationId || query) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={clearLocation}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {loading && <p className="text-[11px] text-muted-foreground">Searching…</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {results.map((location) => (
            <li key={location.id}>
              <button
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left text-xs hover:bg-neutral-100"
                onClick={() => selectLocation(location)}
              >
                <span className="font-medium">{location.name}</span>
                {(location.city || location.country) && (
                  <span className="text-muted-foreground">
                    {[location.city, location.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {locationId && (
        <p className="text-[11px] text-muted-foreground">Location ID: {locationId}</p>
      )}
    </div>
  );
}
