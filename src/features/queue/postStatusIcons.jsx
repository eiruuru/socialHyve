import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Loader2,
  MessageSquareWarning,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { getEffectivePublishStatus } from '@/lib/publishStatus';

const ICON_META = {
  pending_publish: {
    Icon: CircleDashed,
    label: 'Pending publish',
    description: 'Planned on the calendar but not queued to go live yet.',
    chipClass: 'bg-neutral-100 text-neutral-600',
  },
  pending: {
    Icon: ClipboardList,
    label: 'Pending review',
    description: 'Waiting for approval before it can be scheduled to publish.',
    chipClass: 'bg-honey-light text-honey-dark',
  },
  changes_requested: {
    Icon: MessageSquareWarning,
    label: 'Changes requested',
    description: 'Review feedback and update before resubmitting.',
    chipClass: 'bg-[#FCE4E3] text-[#A62E2B]',
  },
  scheduled: {
    Icon: CalendarClock,
    label: 'Scheduled',
    description: 'Queued to publish at the planned time.',
    chipClass: 'bg-[#E4E8FD] text-[#33409E]',
  },
  published: {
    Icon: CheckCircle2,
    label: 'Published',
    description: 'Live on connected platforms.',
    chipClass: 'bg-[#DFF3E6] text-status-published',
  },
  publishing: {
    Icon: Loader2,
    label: 'Publishing',
    description: 'Currently being published.',
    chipClass: 'bg-honey-light text-honey-dark',
  },
  failed: {
    Icon: AlertCircle,
    label: 'Failed',
    description: 'Publish attempt failed — open the post to retry.',
    chipClass: 'bg-[#FCE4E3] text-[#A62E2B]',
  },
};

const SIZE = {
  sm: { chip: 'h-5 w-5', icon: 'h-3 w-3' },
  md: { chip: 'h-6 w-6', icon: 'h-3.5 w-3.5' },
};

export const POST_STATUS_LEGEND = [
  ICON_META.pending_publish,
  ICON_META.pending,
  ICON_META.changes_requested,
  ICON_META.scheduled,
  ICON_META.published,
];

export function getPostStatusIcons(post) {
  if (!post) return [];

  const icons = [];
  const publishStatus = getEffectivePublishStatus(post);

  if (publishStatus === 'published') {
    icons.push({ key: 'publish', ...ICON_META.published });
  } else if (publishStatus === 'publishing') {
    icons.push({ key: 'publish', ...ICON_META.publishing });
  } else if (publishStatus === 'failed') {
    icons.push({ key: 'publish', ...ICON_META.failed });
  } else if (publishStatus === 'scheduled') {
    icons.push({ key: 'publish', ...ICON_META.scheduled });
  } else {
    icons.push({ key: 'publish', ...ICON_META.pending_publish });
  }

  const approval = post.approval_status || 'draft';
  if (approval === 'pending') {
    icons.push({ key: 'approval', ...ICON_META.pending });
  } else if (approval === 'changes_requested') {
    icons.push({ key: 'approval', ...ICON_META.changes_requested });
  }

  return icons;
}

export function PostStatusIconRow({ post, className, size = 'sm' }) {
  const icons = getPostStatusIcons(post);
  const dimensions = SIZE[size] || SIZE.sm;

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {icons.map(({ key, Icon, label, description, chipClass }) => (
        <IconTooltip key={key} title={label} description={description}>
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full',
              dimensions.chip,
              chipClass,
            )}
          >
            <Icon
              className={cn(dimensions.icon, label === 'Publishing' && 'animate-spin')}
              aria-hidden
            />
            <span className="sr-only">{label}</span>
          </span>
        </IconTooltip>
      ))}
    </span>
  );
}

export function PostStatusLegend({ className }) {
  const dimensions = SIZE.sm;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground', className)}>
      <span className="font-medium text-ink">Status icons:</span>
      {POST_STATUS_LEGEND.map(({ Icon, label, chipClass }) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full',
              dimensions.chip,
              chipClass,
            )}
          >
            <Icon className={dimensions.icon} aria-hidden />
          </span>
          {label}
        </span>
      ))}
    </div>
  );
}
