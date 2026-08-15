import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Palette } from 'lucide-react';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { getCanvaConnection } from '@/lib/posts';
import { useClient } from '@/lib/clientContext';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { DialogRoot, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function CanvaDesignPicker({ onSelect, disabled, iconOnly = false }) {
  const { activeClient } = useClient();
  const clientId = activeClient?.id;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(null);

  const { data: connection } = useQuery({
    queryKey: ['canva-connection', clientId],
    queryFn: getCanvaConnection,
    enabled: !!clientId,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['canva-designs', clientId],
    queryFn: () => invokeFunction('canvaListDesigns', { clientId }),
    enabled: open && !!connection && !!clientId,
  });

  const designs = (data?.designs || []).filter((d) =>
    !search || d.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (design) => {
    setExporting(design.id);
    try {
      const result = await invokeFunction('canvaExportDesign', {
        designId: design.id,
        format: 'png',
        clientId,
      });
      onSelect({
        canvaDesignId: design.id,
        title: design.title,
        publicUrl: result.publicUrl,
        storagePath: result.storagePath,
        mimeType: result.mimeType || 'image/png',
      });
      setOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setExporting(null);
    }
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
            {iconOnly ? <Palette className="h-4 w-4" /> : 'Connect Canva'}
          </Link>
        </Button>
      </IconTooltip>
    );
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <IconTooltip title="Add from Canva" description="Browse and attach a Canva design">
        <DialogTrigger asChild>
          <Button
            type="button"
            variant={iconOnly ? 'ghost' : 'outline'}
            size={iconOnly ? 'icon' : 'default'}
            disabled={disabled}
            aria-label="Add from Canva"
            className={cn(iconOnly && 'h-9 w-9 shrink-0')}
          >
            {iconOnly ? <Palette className="h-4 w-4" /> : 'Add from Canva'}
          </Button>
        </DialogTrigger>
      </IconTooltip>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Canva Design</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search designs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading designs...</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {designs.map((design) => (
                <button
                  key={design.id}
                  type="button"
                  disabled={exporting === design.id}
                  onClick={() => handleSelect(design)}
                  className="rounded-lg border p-2 text-left transition hover:border-primary disabled:opacity-50"
                >
                  {design.thumbnailUrl ? (
                    <img
                      src={design.thumbnailUrl}
                      alt={design.title}
                      className="mb-2 aspect-video w-full rounded object-cover"
                    />
                  ) : (
                    <div className="mb-2 flex aspect-video items-center justify-center rounded bg-muted text-xs">
                      No preview
                    </div>
                  )}
                  <p className="truncate text-sm font-medium">{design.title}</p>
                  {exporting === design.id && (
                    <p className="text-xs text-muted-foreground">Exporting...</p>
                  )}
                </button>
              ))}
            </div>
          )}
          {!isLoading && !designs.length && (
            <p className="text-sm text-muted-foreground">No designs found.</p>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Refresh</Button>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
