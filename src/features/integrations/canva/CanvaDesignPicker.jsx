import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { Button } from '@/components/ui/button';
import { DialogRoot, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function CanvaDesignPicker({ onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['canva-designs'],
    queryFn: () => invokeFunction('canvaListDesigns'),
    enabled: open,
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

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          Add from Canva
        </Button>
      </DialogTrigger>
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
            <p className="text-sm text-muted-foreground">No designs found. Connect Canva in settings.</p>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Refresh</Button>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
