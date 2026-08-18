import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { showToast } from '@/lib/toast';
import { shortenUrlsInCaption } from '@/lib/shortLinks';
import { CaptionEditorToolbar } from './CaptionEditorToolbar';
import { cn } from '@/lib/utils';

export function CaptionOverrideField({
  platform,
  value,
  onChange,
  baseCaption,
  internalName,
  label,
  charLimit,
  className,
  shortenUrls = false,
  onShortenUrlsChange,
  postId,
  clientName,
  postLabel,
}) {
  const [generating, setGenerating] = useState(false);
  const [shortening, setShortening] = useState(false);
  const textareaRef = useRef(null);
  const length = value?.length ?? 0;
  const remaining = charLimit - length;
  const nearLimit = remaining < charLimit * 0.1;
  const overLimit = remaining < 0;
  const showFbToolbar = platform === 'facebook' && onShortenUrlsChange;

  const handleAiCaption = async () => {
    setGenerating(true);
    try {
      const data = await invokeFunction('generateCaption', {
        platform,
        baseCaption,
        internalName,
        label,
      });
      if (data?.caption) {
        onChange(data.caption);
        showToast({ title: 'Caption generated', variant: 'success' });
      }
    } catch (err) {
      const message = err.message || 'Could not generate caption';
      showToast({
        title: 'AI Caption unavailable',
        description: message.includes('OPENAI') ? 'Configure OPENAI_API_KEY in server settings.' : message,
        variant: 'error',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleShortenNow = async () => {
    if (!shortenUrls || !value?.trim()) return;
    setShortening(true);
    try {
      const next = await shortenUrlsInCaption(value, { postId });
      if (next !== value) onChange(next);
    } catch (err) {
      showToast({ title: 'Could not shorten URLs', description: err.message, variant: 'error' });
    } finally {
      setShortening(false);
    }
  };

  useEffect(() => {
    if (!shortenUrls || !value?.trim()) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setShortening(true);
      try {
        const next = await shortenUrlsInCaption(value, { postId });
        if (!cancelled && next !== value) onChange(next);
      } catch {
        // Keep original caption if shortening fails silently during typing.
      } finally {
        if (!cancelled) setShortening(false);
      }
    }, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, shortenUrls, postId, onChange]);

  return (
    <div className={cn('space-y-0', className)}>
      <label className="mb-1.5 block text-xs font-medium">Caption override</label>
      <div className="overflow-hidden rounded-md border border-neutral-200">
        <Textarea
          ref={textareaRef}
          placeholder={baseCaption || 'Same as main caption'}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="min-h-[120px] resize-y border-0 focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={handleAiCaption}
            disabled={generating}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {generating ? 'Generating…' : 'AI Caption'}
          </Button>
          <p className={cn('text-xs', overLimit ? 'text-red-600' : nearLimit ? 'text-amber-600' : 'text-muted-foreground')}>
            {overLimit ? `${Math.abs(remaining)} over limit` : `${remaining} characters remaining`}
          </p>
        </div>
        {showFbToolbar && (
          <div className="px-3 pb-2">
            <CaptionEditorToolbar
              textareaRef={textareaRef}
              value={value}
              onChange={onChange}
              shortenUrls={shortenUrls}
              onShortenUrlsChange={onShortenUrlsChange}
              onShortenNow={handleShortenNow}
              clientName={clientName}
              postLabel={postLabel || label}
            />
            {shortening && (
              <p className="pt-1 text-[11px] text-muted-foreground">Shortening URLs…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
