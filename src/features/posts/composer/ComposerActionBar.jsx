import { Calendar, ClipboardCheck, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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

  const actionButtonClass = 'h-11 w-full justify-center sm:h-10 sm:w-auto';

  return (
    <Card className="border-honey/30 bg-paper shadow-sm">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
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
        <div
          className={cn(
            'grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end',
          )}
        >
          {isEditMode ? (
            <Button onClick={onSaveChanges} disabled={saving} className={actionButtonClass}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          ) : (
            <Button variant="outline" onClick={onSaveDraft} disabled={saving} className={actionButtonClass}>
              <Save className="mr-2 h-4 w-4" />
              Save draft
            </Button>
          )}
          {!isApproved && canSubmitForReview && (
            <Button variant="secondary" onClick={onSubmitForReview} disabled={saving} className={actionButtonClass}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Submit for review
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={onSchedule}
            disabled={saving || publishBlocked}
            title={publishBlocked ? approvalHint : undefined}
            className={actionButtonClass}
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
              className={cn(
                actionButtonClass,
                !isEditMode && 'col-span-2 sm:col-span-1',
              )}
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
