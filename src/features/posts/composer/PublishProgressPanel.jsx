import { ProgressBar } from '@/components/ui/ProgressBar';

export function PublishProgressPanel({ label, subtitle, value, indeterminate = false }) {
  return (
    <div className="space-y-2 rounded-hyve-md border border-honey/30 bg-honey-light/30 p-4">
      <ProgressBar value={value} indeterminate={indeterminate} />
      <p className="text-sm font-medium text-ink">{label}</p>
      {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function getPublishPlatformLabel(publishFacebook, publishInstagram) {
  if (publishFacebook && publishInstagram) return 'Publishing to Facebook and Instagram…';
  if (publishFacebook) return 'Publishing to Facebook…';
  if (publishInstagram) return 'Publishing to Instagram…';
  return 'Publishing…';
}
