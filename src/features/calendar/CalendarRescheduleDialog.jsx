import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimezoneSelect } from '@/components/schedule/TimezoneSelect';
import {
  formatTimezoneLabel,
  minScheduleLocalInput,
  utcToZonedLocalInput,
  zonedLocalToUtc,
} from '@/lib/scheduleTime';
import { getPostCalendarDate } from '@/features/posts/postNavUtils';

export function CalendarRescheduleDialog({
  open,
  onOpenChange,
  post,
  clientTimezone,
  onConfirm,
  saving = false,
}) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleTimezone, setScheduleTimezone] = useState(clientTimezone || 'UTC');

  useEffect(() => {
    if (!open || !post) return;
    const date = getPostCalendarDate(post);
    const tz = post.schedule_timezone || clientTimezone || 'UTC';
    setScheduleTimezone(tz);
    if (date) {
      setScheduledAt(utcToZonedLocalInput(date, tz));
    } else {
      setScheduledAt('');
    }
  }, [open, post, clientTimezone]);

  const title = post?.internal_name || post?.caption?.slice(0, 40) || 'Post';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule post</DialogTitle>
          <p className="truncate text-sm text-muted-foreground">{title}</p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Date & time</label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              min={minScheduleLocalInput(scheduleTimezone)}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Timezone</label>
            <TimezoneSelect
              value={scheduleTimezone}
              onChange={setScheduleTimezone}
              workspaceDefault={clientTimezone}
            />
          </div>
          {scheduledAt && (
            <p className="text-xs text-muted-foreground">
              {format(new Date(zonedLocalToUtc(scheduledAt, scheduleTimezone)), 'PPP p')} (
              {formatTimezoneLabel(scheduleTimezone)})
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!scheduledAt || saving}
            onClick={() => onConfirm({ scheduledAt, scheduleTimezone })}
          >
            {saving ? 'Saving…' : 'Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
