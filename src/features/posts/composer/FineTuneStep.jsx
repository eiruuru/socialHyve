import { Calendar, ClipboardCheck, Save, Send } from 'lucide-react';
import { PlatformPreviewTabs } from '@/features/posts/previews/PlatformPreviewTabs';
import { OptimizationTips } from './OptimizationTips';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FineTuneStep({
  step,
  setStep,
  caption,
  platformOverrides,
  setPlatformOverrides,
  firstComment,
  setFirstComment,
  scheduledAt,
  publishFacebook,
  publishInstagram,
  media,
  postId,
  saving,
  onSaveDraft,
  onSubmitForReview,
  onSchedule,
  onPublishNow,
}) {
  const fbCaption = platformOverrides.facebook?.caption ?? caption;
  const igCaption = platformOverrides.instagram?.caption ?? caption;
  const fbSchedule = platformOverrides.facebook?.scheduled_at ?? scheduledAt;
  const igSchedule = platformOverrides.instagram?.scheduled_at ?? scheduledAt;

  const updateOverride = (platform, field, value) => {
    setPlatformOverrides((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  const scheduleSummary = [];
  if (publishFacebook) {
    scheduleSummary.push(`Facebook — ${fbSchedule ? new Date(fbSchedule).toLocaleString() : 'Not set'}`);
  }
  if (publishInstagram) {
    scheduleSummary.push(`Instagram — ${igSchedule ? new Date(igSchedule).toLocaleString() : 'Not set'}`);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <PlatformPreviewTabs
            caption={caption}
            media={media}
            scheduledAt={scheduledAt}
            publishFacebook={publishFacebook}
            publishInstagram={publishInstagram}
            currentPostId={postId}
            facebookCaption={fbCaption}
            instagramCaption={igCaption}
          />
          <OptimizationTips
            caption={caption}
            media={media}
            publishInstagram={publishInstagram}
            publishFacebook={publishFacebook}
            scheduledAt={scheduledAt}
          />
        </div>

        <div className="space-y-4">
          {publishFacebook && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Facebook</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                <p className="text-xs text-muted-foreground">Placement: Feed only (Reels/Stories coming soon)</p>
              </CardContent>
            </Card>
          )}

          {publishInstagram && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Instagram</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-8 border-t bg-paper/95 px-8 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>← Back</Button>
            {scheduleSummary.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Publishing on {scheduleSummary.join(' · ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onSaveDraft} disabled={saving} title="Save draft" aria-label="Save draft">
              <Save className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={onSubmitForReview} disabled={saving} title="Submit for review" aria-label="Submit for review">
              <ClipboardCheck className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={onSchedule} disabled={saving} title="Schedule" aria-label="Schedule">
              <Calendar className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={onPublishNow} disabled={saving} title="Publish now" aria-label="Publish now">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
