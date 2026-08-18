import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { showToast } from '@/lib/toast';
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
}) {
  const [generating, setGenerating] = useState(false);
  const length = value?.length ?? 0;
  const nearLimit = length > charLimit * 0.9;
  const overLimit = length > charLimit;

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

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium">Caption override</label>
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
      </div>
      <Textarea
        placeholder={baseCaption || 'Same as main caption'}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
      <p className={cn('text-xs', overLimit ? 'text-red-600' : nearLimit ? 'text-amber-600' : 'text-muted-foreground')}>
        {length}/{charLimit}
      </p>
    </div>
  );
}
