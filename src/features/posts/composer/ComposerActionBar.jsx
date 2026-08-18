import { Calendar, ClipboardCheck, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatScheduledLabel, zonedLocalToUtc } from '@/lib/scheduleTime';

export function ComposerActionBar({
  saving,
  publishing,
  isEditMode = false,
  isQueued = false,
  scheduledAt,
  scheduleTimezone,
  approvalStatus = 'draft',
  canBypassApproval = false,
  canPublishNow = true,
  canSubmitForReview = true,
  fineTuneHints = [],
  onSaveDraft,
  onSaveChanges,
  onSubmitForReview,
  onSchedule,
  onPublishNow,
}) {
  const isApproved = approvalStatus === 'approved';
  const publishBlocked = !isApproved && !canBypassApproval;
  const approvalHint = publishBlocked
    ? (approvalStatus === 'pending'
      ? 'Waiting for approval before you can schedule or publish.'
      : approvalStatus === 'changes_requested'
        ? 'Address feedback and resubmit for review first.'
        : 'Submit for review and get approval before scheduling or publishing.')
    : null;

  const fineTuneHint = fineTuneHints.length ? fineTuneHints.join(' · ') : null;
  const statusHint = fineTuneHint || approvalHint;

  return (
    <Card className="border-honey/30 bg-paper shadow-sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0 text-sm text-muted-foreground">
          {statusHint ? (
            <span className={fineTuneHint ? 'text-red-700' : undefined}>{statusHint}</span>
          ) : isEditMode ? (
            <span>
              {canPublishNow
                ? (isQueued
                  ? 'Save your edits, or reschedule and publish from here.'
                  : 'Save your edits, or schedule to queue for publishing.')
                : (isQueued
                  ? 'Save your edits or click Reschedule to change the publish time.'
                  : 'Pick a schedule time and click Schedule to queue for publishing.')}
            </span>
          ) : scheduledAt ? (
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
          {isEditMode ? (
            <Button onClick={onSaveChanges} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          ) : (
            <Button variant="outline" onClick={onSaveDraft} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Save draft
            </Button>
          )}
          {!isApproved && canSubmitForReview && (
            <Button variant="secondary" onClick={onSubmitForReview} disabled={saving}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Submit for review
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={onSchedule}
            disabled={saving || publishBlocked}
            title={publishBlocked ? approvalHint : undefined}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {isQueued ? 'Reschedule' : 'Schedule'}
          </Button>
          {canPublishNow && (
          <Button
            variant={isEditMode ? 'secondary' : 'default'}
            onClick={onPublishNow}
            disabled={saving || publishing || publishBlocked}
            title={publishBlocked ? approvalHint : undefined}
          >
            <Send className="mr-2 h-4 w-4" />
            {publishing ? 'Publishing…' : 'Publish now'}
          </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
