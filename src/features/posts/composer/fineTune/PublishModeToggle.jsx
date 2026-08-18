import { cn } from '@/lib/utils';

export function PublishModeToggle({ value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium">Publish mode</label>
      <div className="flex gap-1.5">
        {[
          { id: 'automatic', label: 'Automatic' },
          { id: 'manual', label: 'Manual' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors',
              value === option.id
                ? 'border-honey bg-honey/10 text-ink'
                : 'border-neutral-200 text-muted-foreground hover:border-neutral-300 hover:text-ink',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Manual marks the post for hand-off when automatic API publish is unavailable.
      </p>
    </div>
  );
}
