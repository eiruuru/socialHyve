import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { validateFineTune } from '@/features/posts/platformOverrides';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES = {
  ok: {
    icon: CheckCircle2,
    className: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    iconClassName: 'text-emerald-600',
  },
  warn: {
    icon: Info,
    className: 'text-amber-800 bg-amber-50 border-amber-100',
    iconClassName: 'text-amber-600',
  },
  error: {
    icon: AlertCircle,
    className: 'text-red-800 bg-red-50 border-red-100',
    iconClassName: 'text-red-600',
  },
};

function TipRow({ severity, message }) {
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.warn;
  const Icon = style.icon;
  return (
    <li className={cn('flex items-start gap-2 rounded-md border px-3 py-2 text-xs', style.className)}>
      <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', style.iconClassName)} />
      <span>{message}</span>
    </li>
  );
}

function PlatformStatusBadge({ platform, status }) {
  if (!status) return null;
  const label = platform === 'facebook' ? 'Facebook' : 'Instagram';
  const tone = status.errors.length
    ? 'text-red-700 bg-red-50 border-red-100'
    : status.warnings.length
      ? 'text-amber-800 bg-amber-50 border-amber-100'
      : 'text-emerald-700 bg-emerald-50 border-emerald-100';
  const summary = status.errors.length
    ? `${status.errors.length} error${status.errors.length === 1 ? '' : 's'}`
    : status.warnings.length
      ? `${status.warnings.length} warning${status.warnings.length === 1 ? '' : 's'}`
      : 'Ready';

  return (
    <div className={cn('rounded-md border px-3 py-2 text-xs font-medium', tone)}>
      {label}: {summary}
    </div>
  );
}

export function PlatformOptimizationTips({
  caption,
  media,
  platformOverrides,
  publishFacebook,
  publishInstagram,
  scheduledAt,
  firstComment,
}) {
  const validation = validateFineTune({
    caption,
    media,
    platformOverrides,
    publishFacebook,
    publishInstagram,
    scheduledAt,
    firstComment,
  });

  const allTips = [
    ...validation.errors.map((message) => ({ severity: 'error', message })),
    ...validation.warnings.map((message) => ({ severity: 'warn', message })),
    ...validation.tips,
  ];

  if (!allTips.length && !publishFacebook && !publishInstagram) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Optimization tips</p>
        <p className="text-xs text-muted-foreground">
          Platform-specific guidance based on your content and fine-tune settings.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {publishFacebook && (
          <PlatformStatusBadge platform="facebook" status={validation.platformStatus.facebook} />
        )}
        {publishInstagram && (
          <PlatformStatusBadge platform="instagram" status={validation.platformStatus.instagram} />
        )}
      </div>

      {allTips.length > 0 ? (
        <ul className="space-y-2">
          {allTips.map((tip) => (
            <TipRow key={`${tip.severity}-${tip.message}`} severity={tip.severity} message={tip.message} />
          ))}
        </ul>
      ) : (
        <TipRow severity="ok" message="Everything looks good for the selected platforms." />
      )}
    </div>
  );
}

export { validateFineTune };
