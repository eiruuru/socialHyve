import { Calendar, ClipboardCheck, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatScheduledLabel, zonedLocalToUtc } from '@/lib/scheduleTime';

export function ComposerActionBar({
  saving,
  scheduledAt,
  scheduleTimezone,
  onSaveDraft,
  onSubmitForReview,
  onSchedule,
  onPublishNow,
}) {
  return (
    <Card className="border-honey/30 bg-paper shadow-sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0 text-sm text-muted-foreground">
          {scheduledAt ? (
            <span>
              Scheduled for{' '}
              <span className="font-medium text-ink">
                {formatScheduledLabel(
                  zonedLocalToUtc(scheduledAt, scheduleTimezone),
                  scheduleTimezone,
                )}
              </span>
            </span>
          ) : (
            <span>Set a schedule time to publish later, or publish now.</span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={onSaveDraft} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            Save draft
          </Button>
          <Button variant="secondary" onClick={onSubmitForReview} disabled={saving}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Submit for review
          </Button>
          <Button variant="secondary" onClick={onSchedule} disabled={saving}>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule
          </Button>
          <Button onClick={onPublishNow} disabled={saving}>
            <Send className="mr-2 h-4 w-4" />
            Publish now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
