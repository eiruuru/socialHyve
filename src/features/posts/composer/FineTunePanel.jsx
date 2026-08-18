import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getFineTuneSummary } from '@/features/posts/platformOverrides';
import { PlatformOptimizationTips } from '@/features/posts/composer/PlatformOptimizationTips';
import { FineTunePlatformEditor } from '@/features/posts/composer/fineTune/FineTunePlatformEditor';
import { cn } from '@/lib/utils';

export function FineTunePanel({
  open,
  onOpenChange,
  caption,
  internalName,
  label,
  platformOverrides,
  setPlatformOverrides,
  firstComment,
  setFirstComment,
  scheduledAt,
  scheduleTimezone,
  publishFacebook,
  publishInstagram,
  media,
  onMediaChange,
}) {
  const summary = getFineTuneSummary(platformOverrides, { publishFacebook, publishInstagram });

  return (
    <Card>
      <CardHeader className={cn(open && 'pb-0')}>
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="flex w-full items-center justify-between gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-honey-dark focus-visible:ring-offset-2"
        >
          <div className="min-w-0">
            <span className="font-display text-lg font-bold leading-none tracking-tight">Fine tune</span>
            <p className="mt-1 text-xs text-muted-foreground">
              {open ? 'Customize per platform (optional)' : summary}
            </p>
          </div>
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-4">
          <div className="grid gap-8 lg:grid-cols-2">
            <PlatformOptimizationTips
              caption={caption}
              media={media}
              platformOverrides={platformOverrides}
              publishFacebook={publishFacebook}
              publishInstagram={publishInstagram}
              scheduledAt={scheduledAt}
              firstComment={firstComment}
            />
            <FineTunePlatformEditor
              platformOverrides={platformOverrides}
              setPlatformOverrides={setPlatformOverrides}
              publishFacebook={publishFacebook}
              publishInstagram={publishInstagram}
              caption={caption}
              internalName={internalName}
              label={label}
              scheduledAt={scheduledAt}
              scheduleTimezone={scheduleTimezone}
              media={media}
              onMediaChange={onMediaChange}
              firstComment={firstComment}
              setFirstComment={setFirstComment}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
