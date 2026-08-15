import { HexMark } from '@/components/brand/HexMark';

export function EmptyHiveState({ title = 'The hive is empty', description, compact = false }) {
  return (
    <div className={compact ? 'py-8 text-center' : 'flex flex-col items-center justify-center py-16 text-center'}>
      <HexMark variant="dark" size={compact ? 36 : 46} className="mx-auto mb-3 opacity-90" />
      <p className={compact ? 'text-sm font-semibold text-neutral-600' : 'text-base font-semibold text-neutral-600'}>
        {title}
      </p>
      {description && (
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      )}
    </div>
  );
}
