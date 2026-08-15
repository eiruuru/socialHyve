import { ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function PlatformSection({ title, children, className }) {
  return (
    <section className={cn('space-y-3', className)}>
      <p className="text-sm font-medium">{title}</p>
      {children}
    </section>
  );
}

export function FineTunePanel({
  open,
  onOpenChange,
  caption,
  platformOverrides,
  setPlatformOverrides,
  firstComment,
  setFirstComment,
  scheduledAt,
  publishFacebook,
  publishInstagram,
}) {
  const updateOverride = (platform, field, value) => {
    setPlatformOverrides((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  const showBoth = publishFacebook && publishInstagram;

  return (
    <Card>
      <CardHeader className={cn(open && 'pb-0')}>
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="flex w-full items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-honey-dark focus-visible:ring-offset-2"
        >
          <span className="font-display text-lg font-bold leading-none tracking-tight">Fine tune</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-4">
          <div className={cn(showBoth && 'grid gap-8 lg:grid-cols-2')}>
            {publishFacebook && (
              <PlatformSection
                title="Facebook"
                className={cn(showBoth && 'lg:pr-8 lg:border-r lg:border-neutral-200')}
              >
                <div>
                  <label className="mb-1 block text-xs font-medium">Caption override</label>
                  <Textarea
                    placeholder={caption || 'Same as main caption'}
                    value={platformOverrides.facebook?.caption ?? ''}
                    onChange={(e) => updateOverride('facebook', 'caption', e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Schedule override</label>
                  <Input
                    type="datetime-local"
                    value={platformOverrides.facebook?.scheduled_at ?? scheduledAt}
                    onChange={(e) => updateOverride('facebook', 'scheduled_at', e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Placement: Feed only</p>
              </PlatformSection>
            )}

            {publishInstagram && (
              <PlatformSection
                title="Instagram"
                className={cn(showBoth && 'border-t border-neutral-200 pt-8 lg:border-t-0 lg:pt-0 lg:pl-8')}
              >
                <div>
                  <label className="mb-1 block text-xs font-medium">Caption override</label>
                  <Textarea
                    placeholder={caption || 'Same as main caption'}
                    value={platformOverrides.instagram?.caption ?? ''}
                    onChange={(e) => updateOverride('instagram', 'caption', e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Schedule override</label>
                  <Input
                    type="datetime-local"
                    value={platformOverrides.instagram?.scheduled_at ?? scheduledAt}
                    onChange={(e) => updateOverride('instagram', 'scheduled_at', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">First comment</label>
                  <Textarea
                    placeholder="Auto-post as first comment on Instagram"
                    value={firstComment}
                    onChange={(e) => setFirstComment(e.target.value)}
                    rows={2}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Placement: Feed only</p>
              </PlatformSection>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
