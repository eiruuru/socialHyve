import { Info } from 'lucide-react';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { cn } from '@/lib/utils';

export function AiGeneratedCheckbox({ checked, onChange, className }) {
  return (
    <label className={cn('flex items-start gap-2 text-xs text-ink', className)}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span className="flex items-center gap-1.5">
        AI Generated
        <IconTooltip
          title="AI Generated"
          description="When checked, Instagram adds an AI-info label indicating the content was created or significantly edited with AI. For carousels, the label applies to the whole post."
        >
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </IconTooltip>
      </span>
    </label>
  );
}
