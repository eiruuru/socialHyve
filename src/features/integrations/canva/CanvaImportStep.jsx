import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FORMAT_OPTIONS, parsePageRange, validatePages } from './pageRange';

export function CanvaImportStep({
  design,
  clientId,
  onBack,
  onImport,
  remainingSlots,
}) {
  const [formatType, setFormatType] = useState('png');
  const [pagesInput, setPagesInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const { data: meta, isLoading } = useQuery({
    queryKey: ['canva-design', design?.id, clientId],
    queryFn: () => invokeFunction('canvaGetDesign', { designId: design.id, clientId }),
    enabled: !!design?.id && !!clientId,
  });

  const pageCount = meta?.pageCount ?? 1;
  const thumbnailUrl = meta?.thumbnailUrl || design?.thumbnailUrl;
  const title = meta?.title || design?.title || 'Untitled';
  const showPagesField = pageCount > 1 && formatType !== 'mp4';

  const handleImport = async () => {
    setError('');
    setImporting(true);
    try {
      let pages = null;
      if (showPagesField && pagesInput.trim()) {
        pages = validatePages(parsePageRange(pagesInput), pageCount);
      }

      const result = await invokeFunction('canvaExportDesign', {
        designId: design.id,
        formatType,
        pages: pages || undefined,
        clientId,
      });

      const files = result?.files || [];
      if (!files.length) throw new Error('No files were exported');

      const items = files.slice(0, remainingSlots).map((file) => ({
        canvaDesignId: file.canvaDesignId,
        publicUrl: file.publicUrl,
        storagePath: file.storagePath,
        mimeType: file.mimeType,
        page: file.page,
      }));

      onImport(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto md:grid-cols-2">
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              Loading preview…
            </div>
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full rounded-lg border object-contain"
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              No preview
            </div>
          )}
          <div>
            <p className="font-medium">{title}</p>
            {pageCount > 1 && (
              <p className="text-sm text-muted-foreground">{pageCount} pages</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Import your Canva design into this post
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium">Import as</label>
            <select
              value={formatType}
              onChange={(e) => setFormatType(e.target.value)}
              className="h-10 w-full rounded-hyve-sm border border-input bg-background px-3 text-sm"
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {showPagesField && (
            <div>
              <label className="mb-1 block text-sm font-medium">Pages</label>
              <Input
                placeholder="e.g. 1-5, 8, 11-13"
                value={pagesInput}
                onChange={(e) => setPagesInput(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank to import all {pageCount} pages. Each page becomes a carousel item.
              </p>
            </div>
          )}

          {remainingSlots < 10 && (
            <p className="text-xs text-muted-foreground">
              {remainingSlots} carousel slot{remainingSlots === 1 ? '' : 's'} remaining.
            </p>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={importing}>
          Back
        </Button>
        <Button type="button" onClick={handleImport} disabled={importing || isLoading}>
          {importing ? 'Importing…' : 'Import'}
        </Button>
      </div>
    </div>
  );
}
