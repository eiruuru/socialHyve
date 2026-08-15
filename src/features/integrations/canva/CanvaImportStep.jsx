import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { FORMAT_OPTIONS, parsePageRange, validatePages } from './pageRange';

const IMPORT_STAGES = [
  'Preparing export…',
  'Exporting from Canva…',
  'Downloading pages…',
  'Saving to your media library…',
];

function clampPage(page, pageCount) {
  return Math.min(Math.max(1, page), pageCount);
}

export function CanvaImportStep({
  design,
  clientId,
  onBack,
  onImport,
  remainingSlots,
}) {
  const [formatType, setFormatType] = useState('png');
  const [pagesInput, setPagesInput] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const [pageJumpInput, setPageJumpInput] = useState('1');
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState(0);
  const [error, setError] = useState('');

  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ['canva-design', design?.id, clientId],
    queryFn: () => invokeFunction('canvaGetDesign', { designId: design.id, clientId }),
    enabled: !!design?.id && !!clientId,
  });

  const pageCount = meta?.pageCount ?? 1;
  const designThumbnailUrl = meta?.thumbnailUrl || design?.thumbnailUrl;
  const title = meta?.title || design?.title || 'Untitled';
  const showPagesField = pageCount > 1 && formatType !== 'mp4';
  const showPageNavigator = pageCount > 1 && formatType !== 'mp4';

  const { data: pagePreview, isLoading: pagePreviewLoading } = useQuery({
    queryKey: ['canva-design-page', design?.id, clientId, previewPage],
    queryFn: () => invokeFunction('canvaGetDesignPages', {
      designId: design.id,
      clientId,
      page: previewPage,
    }),
    enabled: !!design?.id && !!clientId && showPageNavigator,
  });

  const previewUrl = pagePreview?.thumbnailUrl || designThumbnailUrl;
  const previewLoading = metaLoading || (showPageNavigator && pagePreviewLoading);
  const usingFallbackThumbnail = showPageNavigator
    && !pagePreview?.thumbnailUrl
    && Boolean(designThumbnailUrl);

  useEffect(() => {
    if (!importing) {
      setImportStage(0);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setImportStage((prev) => (prev < IMPORT_STAGES.length - 1 ? prev + 1 : prev));
    }, 2200);

    return () => window.clearInterval(interval);
  }, [importing]);

  useEffect(() => {
    setPageJumpInput(String(previewPage));
  }, [previewPage]);

  useEffect(() => {
    if (!showPagesField || !pagesInput.trim()) return;

    try {
      const pages = validatePages(parsePageRange(pagesInput), pageCount);
      if (pages?.length) {
        setPreviewPage(pages[0]);
      }
    } catch {
      // Keep current preview until pages input is valid
    }
  }, [pagesInput, pageCount, showPagesField]);

  const goToPage = (nextPage) => {
    const clamped = clampPage(nextPage, pageCount);
    setPreviewPage(clamped);
  };

  const handlePageJump = () => {
    const parsed = Number.parseInt(pageJumpInput, 10);
    if (Number.isNaN(parsed)) return;
    goToPage(parsed);
  };

  const handleImport = async () => {
    setError('');
    setImporting(true);
    setImportStage(0);
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
          {previewLoading ? (
            <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              Loading preview…
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt={`${title} page ${previewPage}`}
              className="w-full rounded-lg border object-contain"
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              No preview
            </div>
          )}

          {showPageNavigator && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => goToPage(previewPage - 1)}
                  disabled={importing || previewPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm font-medium text-ink">
                  Page {previewPage} of {pageCount}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => goToPage(previewPage + 1)}
                  disabled={importing || previewPage >= pageCount}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={pageJumpInput}
                  onChange={(e) => setPageJumpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePageJump();
                  }}
                  disabled={importing}
                  className="h-8"
                  aria-label="Jump to page"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePageJump}
                  disabled={importing}
                >
                  Go
                </Button>
              </div>
              {usingFallbackThumbnail && (
                <p className="text-xs text-muted-foreground">
                  Page preview is not ready yet — showing design thumbnail.
                </p>
              )}
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
              disabled={importing}
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
                disabled={importing}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank to import all {pageCount} pages. Each page becomes a carousel item.
                {showPageNavigator && ' Preview updates to the first page in your selection.'}
              </p>
            </div>
          )}

          {remainingSlots < 10 && (
            <p className="text-xs text-muted-foreground">
              {remainingSlots} carousel slot{remainingSlots === 1 ? '' : 's'} remaining.
            </p>
          )}

          {importing && (
            <div className="space-y-2 rounded-md border border-honey/30 bg-honey-light/30 p-3">
              <ProgressBar indeterminate />
              <p className="text-sm font-medium text-ink">{IMPORT_STAGES[importStage]}</p>
              <p className="text-xs text-muted-foreground">
                Multi-page exports can take up to a minute.
              </p>
            </div>
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
        <Button type="button" onClick={handleImport} disabled={importing || metaLoading}>
          {importing ? 'Importing…' : 'Import'}
        </Button>
      </div>
    </div>
  );
}
