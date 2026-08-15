import { LayoutGrid, List } from 'lucide-react';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { cn } from '@/lib/utils';

function ViewToggleButton({ active, onClick, title, description, children }) {
  return (
    <IconTooltip title={title} description={description}>
      <button
        type="button"
        onClick={onClick}
        aria-label={title}
        aria-pressed={active}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-hyve-sm transition-colors',
          active
            ? 'bg-honey text-white'
            : 'text-muted-foreground hover:bg-neutral-200 hover:text-ink',
        )}
      >
        {children}
      </button>
    </IconTooltip>
  );
}

export function QueueViewToggle({ viewMode, onViewModeChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-hyve-sm border border-neutral-200 bg-white p-0.5">
      <ViewToggleButton
        active={viewMode === 'list'}
        onClick={() => onViewModeChange('list')}
        title="List view"
        description="Review posts in a detailed list"
      >
        <List className="h-4 w-4" />
      </ViewToggleButton>
      <ViewToggleButton
        active={viewMode === 'grid'}
        onClick={() => onViewModeChange('grid')}
        title="Grid view"
        description="Browse posts as a visual grid"
      >
        <LayoutGrid className="h-4 w-4" />
      </ViewToggleButton>
    </div>
  );
}
