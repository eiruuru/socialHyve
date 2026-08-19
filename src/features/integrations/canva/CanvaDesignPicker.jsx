import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { clearModalLocks } from '@/lib/clearModalLocks';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CanvaIcon } from '@/components/icons/CanvaIcon';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { getCanvaConnection } from '@/lib/posts';
import { useClient } from '@/lib/clientContext';
import { MAX_CAROUSEL_ITEMS } from '@/features/posts/previews/mediaUtils';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { DialogRoot, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CanvaImportStep } from './CanvaImportStep';

export function CanvaDesignPicker({ onSelect, disabled, iconOnly = false, mediaCount = 0 }) {
  const { activeClient } = useClient();
  const clientId = activeClient?.id;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('browse');
  const [search, setSearch] = useState('');
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [allDesigns, setAllDesigns] = useState([]);
  const [continuation, setContinuation] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importNotice, setImportNotice] = useState('');

  const remainingSlots = Math.max(0, MAX_CAROUSEL_ITEMS - mediaCount);

  const { data: connection } = useQuery({
    queryKey: ['canva-connection', clientId],
    queryFn: getCanvaConnection,
    enabled: !!clientId,
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['canva-designs', clientId],
    queryFn: async () => {
      const result = await invokeFunction('canvaListDesigns', { clientId });
      setAllDesigns(result?.designs || []);
      setContinuation(result?.continuation || null);
      return result;
    },
    enabled: open && !!connection && !!clientId && step === 'browse',
  });

  const designs = (allDesigns.length ? allDesigns : data?.designs || []).filter((d) =>
    !search || d.title?.toLowerCase().includes(search.toLowerCase())
  );

  const resetState = () => {
    setStep('browse');
    setSelectedDesign(null);
    setSearch('');
    setImportNotice('');
    setAllDesigns([]);
    setContinuation(null);
  };

  const location = useLocation();

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) {
      resetState();
      clearModalLocks();
    }
  };

  useEffect(() => () => {
    setOpen(false);
    clearModalLocks();
  }, []);

  useEffect(() => {
    setOpen(false);
    resetState();
    clearModalLocks();
  }, [location.pathname]);

  const loadMore = async () => {
    if (!continuation || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await invokeFunction('canvaListDesigns', { clientId, continuation });
      setAllDesigns((prev) => [...prev, ...(result?.designs || [])]);
      setContinuation(result?.continuation || null);
    } catch (err) {
      setImportNotice(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleContinue = () => {
    if (!selectedDesign) return;
    setStep('import');
    setImportNotice('');
  };

  const handleImport = (items) => {
    items.forEach((item) => {
      onSelect({
        canvaDesignId: item.canvaDesignId,
        publicUrl: item.publicUrl,
        storagePath: item.storagePath,
        mimeType: item.mimeType,
      });
    });
    setOpen(false);
    resetState();
  };

  if (!connection) {
    return (
      <IconTooltip
        title="Connect Canva"
        description="Connect Canva for this client in Settings to browse designs"
      >
        <Button
          type="button"
          variant={iconOnly ? 'ghost' : 'outline'}
          size={iconOnly ? 'icon' : 'default'}
          disabled={disabled}
          asChild
          className={cn(iconOnly && 'h-9 w-9 shrink-0')}
        >
          <Link to="/app/settings/canva" aria-label="Connect Canva">
            {iconOnly ? <CanvaIcon className="h-4 w-4" /> : 'Connect Canva'}
          </Link>
        </Button>
      </IconTooltip>
    );
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <IconTooltip title="Add from Canva" description="Browse and attach Canva designs">
        <DialogTrigger asChild>
          <Button
            type="button"
            variant={iconOnly ? 'ghost' : 'outline'}
            size={iconOnly ? 'icon' : 'default'}
            disabled={disabled || remainingSlots === 0}
            aria-label="Add from Canva"
            className={cn(iconOnly && 'h-9 w-9 shrink-0')}
          >
            {iconOnly ? <CanvaIcon className="h-4 w-4" /> : 'Add from Canva'}
          </Button>
        </DialogTrigger>
      </IconTooltip>
      {open ? (
      <DialogContent className="flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-full flex-col overflow-hidden p-4 sm:max-w-5xl sm:p-6 md:mx-4">
        <DialogHeader>
          <DialogTitle>
            {step === 'browse' ? 'Search Canva Designs' : 'Import Canva Design'}
          </DialogTitle>
        </DialogHeader>

        {importNotice && step === 'browse' && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{importNotice}</p>
        )}

        {step === 'browse' ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <Input
              placeholder="Search Canva…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading || isFetching ? (
                <p className="text-sm text-muted-foreground">Loading designs…</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {designs.map((design) => {
                    const selected = selectedDesign?.id === design.id;
                    return (
                      <button
                        key={design.id}
                        type="button"
                        onClick={() => setSelectedDesign(design)}
                        className={cn(
                          'rounded-lg border p-2 text-left transition hover:border-primary',
                          selected && 'border-primary ring-2 ring-primary/30'
                        )}
                      >
                        {design.thumbnailUrl ? (
                          <img
                            src={design.thumbnailUrl}
                            alt={design.title}
                            className="mb-2 aspect-[4/5] w-full rounded object-cover"
                          />
                        ) : (
                          <div className="mb-2 flex aspect-[4/5] items-center justify-center rounded bg-muted text-xs">
                            No preview
                          </div>
                        )}
                        <p className="truncate text-sm font-medium">{design.title}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              {!isLoading && !designs.length && (
                <p className="text-sm text-muted-foreground">No designs found.</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => refetch()}>Refresh</Button>
                {continuation && (
                  <Button variant="ghost" size="sm" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleContinue} disabled={!selectedDesign}>
                  Continue
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <CanvaImportStep
            design={selectedDesign}
            clientId={clientId}
            remainingSlots={remainingSlots}
            onBack={() => setStep('browse')}
            onImport={handleImport}
          />
        )}
      </DialogContent>
      ) : null}
    </DialogRoot>
  );
}
