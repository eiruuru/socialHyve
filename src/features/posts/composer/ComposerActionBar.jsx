import { Calendar, ClipboardCheck, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobileLayout } from '@/lib/deviceTier';
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
  const isMobile = useIsMobileLayout();
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

  const actionButtonClass = cn(
    'h-11 w-full min-w-0 justify-center px-2 text-xs sm:h-10 sm:w-auto sm:px-4 sm:text-sm',
  );

  const renderIcon = (Icon) => (
    !isMobile ? <Icon className="mr-2 h-4 w-4 shrink-0" aria-hidden /> : null
  );

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
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          {isEditMode ? (
            <Button onClick={onSaveChanges} disabled={saving} className={cn(actionButtonClass, 'col-span-2 sm:col-span-1')}>
              {renderIcon(Save)}
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          ) : (
            <Button variant="outline" onClick={onSaveDraft} disabled={saving} className={actionButtonClass}>
              {renderIcon(Save)}
              Save draft
            </Button>
          )}
          {!isApproved && canSubmitForReview && (
            <Button variant="secondary" onClick={onSubmitForReview} disabled={saving} className={actionButtonClass}>
              {renderIcon(ClipboardCheck)}
              {isMobile ? 'Submit' : 'Submit for review'}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={onSchedule}
            disabled={saving || publishBlocked}
            title={publishBlocked ? approvalHint : undefined}
            className={actionButtonClass}
          >
            {renderIcon(Calendar)}
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
              {renderIcon(Send)}
              {publishing ? 'Publishing…' : 'Publish now'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
