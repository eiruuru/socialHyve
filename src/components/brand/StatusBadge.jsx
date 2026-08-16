import { cn } from '@/lib/utils';

const VARIANTS = {
  draft: 'bg-neutral-100 text-neutral-600',
  pending: 'bg-honey-light text-honey-dark',
  approved: 'bg-[#DFF3E6] text-status-published',
  changes: 'bg-[#FCE4E3] text-[#A62E2B]',
  changes_requested: 'bg-[#FCE4E3] text-[#A62E2B]',
  scheduled: 'bg-[#E4E8FD] text-[#33409E]',
  published: 'bg-[#DFF3E6] text-status-published',
  failed: 'bg-[#FCE4E3] text-[#A62E2B]',
  publishing: 'bg-honey-light text-honey-dark',
  approved_draft: 'bg-honey-light text-honey-dark ring-1 ring-honey-dark/25',
  default: 'bg-neutral-100 text-neutral-600',
  facebook: 'bg-[#E4E8FD] text-platform-fb',
  instagram: 'bg-gradient-to-r from-[#FCE4E3] to-[#F3E4FD] text-[#8134AF]',
};

const DOT_COLORS = {
  draft: 'bg-status-draft',
  pending: 'bg-status-pending',
  approved: 'bg-status-approved',
  changes: 'bg-status-changes',
  changes_requested: 'bg-status-changes',
  scheduled: 'bg-status-scheduled',
  published: 'bg-status-published',
  failed: 'bg-status-changes',
  publishing: 'bg-status-pending',
  approved_draft: 'bg-honey-dark',
};

const LABELS = {
  draft: 'Draft',
  pending: 'Pending review',
  approved: 'Approved',
  changes: 'Changes requested',
  changes_requested: 'Changes requested',
  scheduled: 'Scheduled',
  published: 'Published',
  failed: 'Failed',
  publishing: 'Publishing…',
  approved_draft: 'Approved · needs schedule',
};

export function StatusBadge({ variant = 'default', label, className, showDot = true }) {
  const displayLabel = label || LABELS[variant] || variant;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
        VARIANTS[variant] || VARIANTS.default,
        className
      )}
    >
      {showDot && DOT_COLORS[variant] && (
        <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[variant])} />
      )}
      {displayLabel}
    </span>
  );
}

export { LABELS as STATUS_LABELS };
