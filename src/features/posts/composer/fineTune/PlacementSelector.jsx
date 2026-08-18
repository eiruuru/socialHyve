import { PLACEMENTS, PLACEMENT_LABELS } from '@/features/posts/platformOverrides';
import { cn } from '@/lib/utils';

export function PlacementSelector({ platform, value, onChange }) {
  const options = PLACEMENTS[platform] || PLACEMENTS.facebook;

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium">Placement</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((placement) => (
          <button
            key={placement}
            type="button"
            onClick={() => onChange(placement)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              value === placement
                ? 'bg-honey text-white'
                : 'bg-neutral-100 text-muted-foreground hover:bg-neutral-200 hover:text-ink',
            )}
          >
            {PLACEMENT_LABELS[placement]}
          </button>
        ))}
      </div>
    </div>
  );
}
