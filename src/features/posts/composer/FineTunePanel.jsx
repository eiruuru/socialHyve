import { ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

  return (
    <Card>
      <CardHeader className="pb-0">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="flex w-full items-center justify-between text-left"
        >
          <CardTitle className="font-display">Fine tune</CardTitle>
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4 pt-4">
          {publishFacebook && (
            <div className="space-y-3 rounded-hyve-md border border-neutral-200 p-4">
              <p className="text-sm font-medium">Facebook</p>
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
            </div>
          )}

          {publishInstagram && (
            <div className="space-y-3 rounded-hyve-md border border-neutral-200 p-4">
              <p className="text-sm font-medium">Instagram</p>
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
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
