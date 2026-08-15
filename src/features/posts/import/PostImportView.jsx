import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useClient } from '@/lib/clientContext';
import { useMembership } from '@/lib/membershipContext';
import { createPost } from '@/lib/posts';
import {
  LARGE_FILE_ROW_THRESHOLD,
  MAX_IMPORT_ROWS,
  parsePostCsvText,
  POST_IMPORT_TEMPLATE_URL,
  truncateCaption,
} from '@/lib/postCsvImport';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STEPS = {
  IDLE: 'idle',
  PARSING: 'parsing',
  PREVIEW: 'preview',
  IMPORTING: 'importing',
  SUMMARY: 'summary',
};

function ProgressPanel({ indeterminate, value, title, subtitle }) {
  return (
    <div className="space-y-2 rounded-md border border-honey/30 bg-honey-light/30 p-3">
      <ProgressBar indeterminate={indeterminate} value={value} />
      <p className="text-sm font-medium text-ink">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function PostImportView() {
  const queryClient = useQueryClient();
  const { activeClient, clients, loading: clientsLoading } = useClient();
  const { isManager } = useMembership();

  const [step, setStep] = useState(STEPS.IDLE);
  const [parseLabel, setParseLabel] = useState('Reading file…');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState('');
  const [clientChangedNotice, setClientChangedNotice] = useState('');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, caption: '' });
  const [importResults, setImportResults] = useState({ created: 0, failed: [] });

  const previewClientIdRef = useRef(null);
  const fileInputRef = useRef(null);

  const busy = step === STEPS.PARSING || step === STEPS.IMPORTING;
  const clientTimezone = activeClient?.default_timezone || null;

  const resetImport = useCallback(() => {
    setStep(STEPS.IDLE);
    setFileName('');
    setParsed(null);
    setParseError('');
    setClientChangedNotice('');
    setImportProgress({ current: 0, total: 0, caption: '' });
    setImportResults({ created: 0, failed: [] });
    previewClientIdRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    if (step !== STEPS.PREVIEW || !previewClientIdRef.current || !activeClient?.id) return;
    if (previewClientIdRef.current !== activeClient.id) {
      resetImport();
      setClientChangedNotice('Client changed — upload your CSV again to import for the new client.');
    }
  }, [activeClient?.id, step, resetImport]);

  const handleFile = async (file) => {
    if (!file || busy || !activeClient) return;

    setParseError('');
    setClientChangedNotice('');
    setFileName(file.name);
    setStep(STEPS.PARSING);
    setParseLabel('Reading file…');

    try {
      const text = await file.text();
      const lineCount = text.split(/\r?\n/).filter((line) => line.trim()).length - 1;

      if (lineCount >= LARGE_FILE_ROW_THRESHOLD) {
        setParseLabel('Validating rows…');
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      const validated = parsePostCsvText(text, clientTimezone);
      previewClientIdRef.current = activeClient.id;
      setParsed(validated);
      setStep(STEPS.PREVIEW);
    } catch (err) {
      setParseError(err.message || 'Could not parse CSV file');
      setStep(STEPS.IDLE);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const handleImport = async () => {
    if (!parsed || !activeClient) return;

    const validRows = parsed.rows.filter((row) => !row.errors.length && row.payload);
    if (!validRows.length) return;

    setStep(STEPS.IMPORTING);
    setImportProgress({ current: 0, total: validRows.length, caption: '' });

    const failed = [];
    let created = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setImportProgress({
        current: i,
        total: validRows.length,
        caption: truncateCaption(row.row.caption),
      });

      try {
        await createPost(row.payload);
        created += 1;
      } catch (err) {
        failed.push({
          rowIndex: row.rowIndex,
          message: err.message || 'Failed to create post',
        });
      }

      setImportProgress({
        current: i + 1,
        total: validRows.length,
        caption: truncateCaption(row.row.caption),
      });
    }

    await queryClient.invalidateQueries({ queryKey: ['posts', activeClient.id] });
    setImportResults({ created, failed });
    setStep(STEPS.SUMMARY);
  };

  if (!clientsLoading && clients.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyHiveState
          title={isManager ? 'No clients assigned yet' : 'No clients yet'}
          description={
            isManager
              ? 'Ask your admin to assign you to a client before importing posts.'
              : 'Create a client before importing posts.'
          }
        />
        {!isManager && (
          <div className="flex justify-center">
            <Button asChild>
              <Link to="/app/clients">Go to Clients</Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  const validCount = parsed?.validCount ?? 0;
  const importPercent = importProgress.total
    ? Math.round((importProgress.current / importProgress.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Bulk import</p>
        <h2 className="font-display text-2xl font-bold">Import posts from CSV</h2>
        <p className="text-muted-foreground">
          Download the template, fill in your posts, then upload to create drafts.
        </p>
      </div>

      {activeClient && (
        <div className="rounded-hyve-md border border-honey/30 bg-honey-light/40 px-4 py-3">
          <p className="text-sm text-ink">
            Importing posts for <span className="font-semibold">{activeClient.name}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Switch clients in the header to import for a different client.
          </p>
        </div>
      )}

      {clientChangedNotice && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{clientChangedNotice}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Download the CSV template</li>
            <li>Fill in your post captions and optional schedule metadata</li>
            <li>Remove the example rows or replace them with your content</li>
            <li>Upload the file and review the preview</li>
            <li>Import to create draft posts — add media in the composer afterward</li>
          </ol>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" disabled={busy}>
              <a href={POST_IMPORT_TEMPLATE_URL} download="post-import-template.csv">
                <Download className="mr-2 h-4 w-4" />
                Download template
              </a>
            </Button>
            {step !== STEPS.IDLE && step !== STEPS.PARSING && (
              <Button type="button" variant="ghost" onClick={resetImport} disabled={busy}>
                Start over
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {(step === STEPS.IDLE || step === STEPS.PARSING) && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Upload CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-hyve-md border-2 border-dashed px-6 py-12 text-center transition-colors',
                busy ? 'cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60' : 'border-neutral-300 hover:border-honey hover:bg-honey-light/20',
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-ink">Drop CSV here or click to upload</p>
              <p className="mt-1 text-sm text-muted-foreground">Up to {MAX_IMPORT_ROWS} rows per file</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={busy || !activeClient}
                onChange={onFileChange}
              />
            </label>

            {step === STEPS.PARSING && (
              <ProgressPanel
                indeterminate
                title={parseLabel}
                subtitle={fileName ? `File: ${fileName}` : undefined}
              />
            )}

            {parseError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {step === STEPS.PREVIEW && parsed && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="font-display text-lg">Preview</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {fileName} — {validCount} ready, {parsed.errorCount} with errors
                {parsed.truncated ? ` (only first ${MAX_IMPORT_ROWS} rows processed)` : ''}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleImport}
              disabled={validCount === 0}
            >
              Import {validCount} post{validCount === 1 ? '' : 's'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-hyve-sm border">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Caption</th>
                    <th className="px-3 py-2">Label</th>
                    <th className="px-3 py-2">Platforms</th>
                    <th className="px-3 py-2">Scheduled</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((row) => {
                    const platforms = [];
                    const fb = row.row.publish_facebook;
                    const ig = row.row.publish_instagram;
                    if (fb !== false && String(fb).toLowerCase() !== 'false') platforms.push('FB');
                    if (ig !== false && String(ig).toLowerCase() !== 'false') platforms.push('IG');
                    const hasError = row.errors.length > 0;

                    return (
                      <tr key={row.rowIndex} className="border-t align-top">
                        <td className="px-3 py-2 font-mono text-xs">{row.rowIndex}</td>
                        <td className="max-w-xs px-3 py-2">{row.row.caption || '—'}</td>
                        <td className="px-3 py-2">{row.row.label || '—'}</td>
                        <td className="px-3 py-2">{platforms.join(', ') || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.row.scheduled_at || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {hasError ? (
                            <ul className="space-y-1 text-xs text-red-600">
                              {row.errors.map((msg) => (
                                <li key={msg}>{msg}</li>
                              ))}
                            </ul>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-xs font-medium text-green-700">Ready</span>
                              {row.warnings.map((msg) => (
                                <p key={msg} className="text-xs text-amber-600">{msg}</p>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {step === STEPS.IMPORTING && (
        <ProgressPanel
          value={importPercent}
          title={`Creating ${importProgress.current} of ${importProgress.total}`}
          subtitle={importProgress.caption ? `"${importProgress.caption}"` : undefined}
        />
      )}

      {step === STEPS.SUMMARY && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <FileSpreadsheet className="h-5 w-5 text-honey-dark" />
              Import complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-ink">
              Created <span className="font-semibold">{importResults.created}</span> draft post
              {importResults.created === 1 ? '' : 's'} for {activeClient?.name}.
            </p>

            {importResults.failed.length > 0 && (
              <div className="rounded-md bg-red-50 px-3 py-2">
                <p className="text-sm font-medium text-red-800">
                  {importResults.failed.length} row{importResults.failed.length === 1 ? '' : 's'} failed
                </p>
                <ul className="mt-2 space-y-1 text-xs text-red-700">
                  {importResults.failed.map((item) => (
                    <li key={item.rowIndex}>
                      Row {item.rowIndex}: {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/app/calendar">View calendar</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/queue">View queue</Link>
              </Button>
              <Button type="button" variant="ghost" onClick={resetImport}>
                Import another file
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
