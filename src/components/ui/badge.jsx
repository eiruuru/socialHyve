import { StatusBadge } from '@/components/brand/StatusBadge';
import { cn } from '@/lib/utils';

const legacyMap = {
  default: 'default',
  draft: 'draft',
  scheduled: 'scheduled',
  publishing: 'publishing',
  published: 'published',
  failed: 'failed',
  facebook: 'facebook',
  instagram: 'instagram',
  pending: 'pending',
  approved: 'approved',
  changes_requested: 'changes_requested',
};

export function Badge({ className, variant = 'default', children, ...props }) {
  const mapped = legacyMap[variant] || variant;
  return (
    <StatusBadge
      variant={mapped}
      label={children}
      className={cn(className)}
      {...props}
    />
  );
}
