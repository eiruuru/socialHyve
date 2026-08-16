import { useEffect, useState } from 'react';
import { schedulePost, unschedulePost, updatePost } from '@/lib/posts';
import { getEffectivePublishStatus } from '@/lib/publishStatus';
import {
  formatScheduledLabel,
  formatTimezoneLabel,
  isScheduleInPast,
  minScheduleLocalInput,
  resolveScheduleTimezone,
  utcToZonedLocalInput,
  zonedLocalToUtc,
} from '@/lib/scheduleTime';
import { TimezoneSelect } from '@/components/schedule/TimezoneSelect';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showToast } from '@/lib/toast';

export function PostSchedulePanel({ post, clientTimezone, onUpdated }) {
  const isQueued = getEffectivePublishStatus(post) === 'scheduled';
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleTimezone, setScheduleTimezone] = useState('UTC');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!post) return;
    const tz = resolveScheduleTimezone({
      postTimezone: post.schedule_timezone,
      clientTimezone,
    });
    setScheduleTimezone(tz);
    setScheduledAt(post.scheduled_at ? utcToZonedLocalInput(post.scheduled_at, tz) : '');
  }, [post, clientTimezone]);

  if (!post || post.approval_status !== 'approved') {
    return (
      <p className="text-sm text-muted-foreground">
        Approve this post before scheduling it for publishing.
      </p>
    );
  }

  if (post.status === 'published' || post.status === 'publishing') {
    return null;
  }

  const scheduledAtUtc = scheduledAt ? zonedLocalToUtc(scheduledAt, scheduleTimezone) : null;

  const handleQueue = async () => {
    if (!scheduledAtUtc) {
      showToast({ title: 'Schedule time required', variant: 'error' });
      return;
    }
    if (isScheduleInPast(scheduledAtUtc, { bufferMs: 10 * 60 * 1000 })) {
      showToast({
        title: 'Schedule too soon',
        description: 'Pick a time at least 10 minutes from now.',
        variant: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      if (post.schedule_timezone !== scheduleTimezone) {
        await updatePost(post.id, { schedule_timezone: scheduleTimezone });
      }
      await schedulePost(post.id, scheduledAtUtc);
      showToast({
        title: isQueued ? 'Post rescheduled' : 'Post queued for publishing',
        description: formatScheduledLabel(scheduledAtUtc, scheduleTimezone),
        variant: 'success',
      });
      await onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not schedule', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnqueue = async () => {
    setSaving(true);
    try {
      await unschedulePost(post.id);
      showToast({ title: 'Removed from publish queue', variant: 'success' });
      await onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not unschedule', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          type="datetime-local"
          value={scheduledAt}
          min={minScheduleLocalInput(scheduleTimezone)}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
        <TimezoneSelect value={scheduleTimezone} onChange={setScheduleTimezone} />
      </div>
      <p className="text-xs text-muted-foreground">
        Posts at this time in {formatTimezoneLabel(scheduleTimezone)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleQueue} disabled={saving}>
          {saving ? 'Saving…' : isQueued ? 'Reschedule' : 'Queue for publishing'}
        </Button>
        {isQueued && (
          <Button variant="outline" onClick={handleUnqueue} disabled={saving}>
            Remove from queue
          </Button>
        )}
      </div>
    </div>
  );
}
