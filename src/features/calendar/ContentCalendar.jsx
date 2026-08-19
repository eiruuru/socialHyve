import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useClient } from '@/lib/clientContext';
import { reschedulePostToDay, updatePost } from '@/lib/posts';
import { isPastCalendarDay, isScheduleInPast, zonedLocalToUtc } from '@/lib/scheduleTime';
import { showToast } from '@/lib/toast';
import { isPostDraggable } from './CalendarPostCard';
import { CalendarDayCell } from './CalendarDayCell';
import { CalendarRescheduleDialog } from './CalendarRescheduleDialog';
import { PostStatusLegend } from '@/features/queue/postStatusIcons';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { TabsRoot, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildPostNavSearch, getPostCalendarDate, parseCalendarMonthParam } from '@/features/posts/postNavUtils';
import { DEVICE_TIERS, useDeviceTier } from '@/lib/deviceTier';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function mondayStartWeek(date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function mondayEndWeek(date) {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function ContentCalendar({ posts = [], readOnly = false }) {
  const queryClient = useQueryClient();
  const { activeClient } = useClient();
  const tier = useDeviceTier();
  const touchReschedule = tier === DEVICE_TIERS.TABLET && !readOnly;
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const [currentDate, setCurrentDate] = useState(() => parseCalendarMonthParam(monthParam) || new Date());
  const [view, setView] = useState(() => (tier === DEVICE_TIERS.TABLET ? 'week' : 'month'));
  const [draggingPostId, setDraggingPostId] = useState(null);
  const [dropTargetDay, setDropTargetDay] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [reschedulePost, setReschedulePost] = useState(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  useEffect(() => {
    if (tier === DEVICE_TIERS.TABLET) {
      setView('week');
    }
  }, [tier]);

  useEffect(() => {
    const parsed = parseCalendarMonthParam(monthParam);
    if (parsed) setCurrentDate(parsed);
  }, [monthParam]);

  const syncMonthParam = (date) => {
    if (view !== 'month') return;
    const nextMonth = format(date, 'yyyy-MM');
    if (monthParam === nextMonth) return;
    setSearchParams({ month: nextMonth }, { replace: true });
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthGridStart = mondayStartWeek(monthStart);
  const monthGridEnd = mondayEndWeek(monthEnd);
  const monthDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

  const weekStart = mondayStartWeek(currentDate);
  const weekEnd = mondayEndWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getPostsForDay = (day) =>
    posts.filter((p) => {
      const date = getPostCalendarDate(p);
      return date && isSameDay(new Date(date), day);
    });

  const calendarMonth = format(currentDate, 'yyyy-MM');
  const monthNavSearch = buildPostNavSearch({ nav: 'calendar', month: calendarMonth });

  const handleDragStart = (_e, post) => {
    if (touchReschedule) return;
    setDraggingPostId(post.id);
  };

  const handleDragEnd = () => {
    setDraggingPostId(null);
    setDropTargetDay(null);
  };

  const handleDropOnDay = async (day, e) => {
    e.preventDefault();
    setDropTargetDay(null);

    const postId = e.dataTransfer.getData('text/plain') || draggingPostId;
    if (!postId || rescheduling) return;

    const post = posts.find((p) => p.id === postId);
    if (!post || !isPostDraggable(post)) return;

    if (isPastCalendarDay(day)) {
      showToast({
        title: 'Cannot reschedule',
        description: 'Pick today or a future date.',
        variant: 'error',
      });
      setDraggingPostId(null);
      return;
    }

    const postDate = getPostCalendarDate(post);
    if (postDate && isSameDay(new Date(postDate), day)) {
      setDraggingPostId(null);
      return;
    }

    setRescheduling(true);
    try {
      await reschedulePostToDay(postId, day, post, activeClient?.default_timezone);
      await queryClient.invalidateQueries({ queryKey: ['posts', activeClient?.id] });
    } catch (err) {
      showToast({
        title: 'Could not reschedule',
        description: err.message || 'Try again.',
        variant: 'error',
      });
    } finally {
      setRescheduling(false);
      setDraggingPostId(null);
    }
  };

  const handleRescheduleRequest = (post) => {
    if (!isPostDraggable(post)) return;
    setReschedulePost(post);
    setRescheduleOpen(true);
  };

  const handleRescheduleConfirm = async ({ scheduledAt, scheduleTimezone }) => {
    if (!reschedulePost || rescheduling) return;
    const scheduledUtc = zonedLocalToUtc(scheduledAt, scheduleTimezone);
    if (isScheduleInPast(scheduledUtc)) {
      showToast({ title: 'Cannot reschedule', description: 'Pick a future time.', variant: 'error' });
      return;
    }
    setRescheduling(true);
    try {
      await updatePost(reschedulePost.id, {
        scheduled_at: scheduledUtc,
        schedule_timezone: scheduleTimezone,
      });
      await queryClient.invalidateQueries({ queryKey: ['posts', activeClient?.id] });
      setRescheduleOpen(false);
      setReschedulePost(null);
      showToast({ title: 'Post rescheduled', variant: 'success' });
    } catch (err) {
      showToast({
        title: 'Could not reschedule',
        description: err.message || 'Try again.',
        variant: 'error',
      });
    } finally {
      setRescheduling(false);
    }
  };

  const makeDayHandlers = (day) => ({
    onDragOver: (e) => {
      if (!draggingPostId) return;
      e.preventDefault();
      if (isPastCalendarDay(day)) {
        e.dataTransfer.dropEffect = 'none';
        setDropTargetDay(null);
        return;
      }
      e.dataTransfer.dropEffect = 'move';
      setDropTargetDay(day);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setDropTargetDay((current) =>
          current && isSameDay(current, day) ? null : current,
        );
      }
    },
    onDrop: (e) => handleDropOnDay(day, e),
  });

  const goPrev = () => {
    if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
      return;
    }
    const nextDate = subMonths(currentDate, 1);
    setCurrentDate(nextDate);
    syncMonthParam(nextDate);
  };

  const goNext = () => {
    if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
      return;
    }
    const nextDate = addMonths(currentDate, 1);
    setCurrentDate(nextDate);
    syncMonthParam(nextDate);
  };

  const periodLabel = view === 'week'
    ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
    : format(currentDate, 'MMMM yyyy');

  const prevLabel = view === 'week' ? 'Previous week' : 'Previous month';
  const nextLabel = view === 'week' ? 'Next week' : 'Next month';

  const renderDayGrid = (days, { tall = false } = {}) => (
    <div className="grid grid-cols-7">
      {days.map((day) => (
        <CalendarDayCell
          key={day.toISOString()}
          day={day}
          dayPosts={getPostsForDay(day)}
          currentDate={currentDate}
          readOnly={readOnly || touchReschedule}
          navSearch={monthNavSearch}
          draggingPostId={draggingPostId}
          dropTargetDay={dropTargetDay}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          tall={tall}
          touchReschedule={touchReschedule}
          onRescheduleRequest={handleRescheduleRequest}
          {...makeDayHandlers(day)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Calendar</p>
          <h2 className="font-display text-xl font-bold">{activeClient?.name || 'All posts'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <IconTooltip title={prevLabel} description={`Go to the ${prevLabel.toLowerCase()}`}>
            <Button variant="outline" size="icon" onClick={goPrev} aria-label={prevLabel}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </IconTooltip>
          <h3 className="min-w-[180px] text-center text-lg font-semibold">
            {periodLabel}
          </h3>
          <IconTooltip title={nextLabel} description={`Go to the ${nextLabel.toLowerCase()}`}>
            <Button variant="outline" size="icon" onClick={goNext} aria-label={nextLabel}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </IconTooltip>
        </div>
        <TabsRoot value={view} onValueChange={setView}>
          <TabsList>
            {tier !== DEVICE_TIERS.TABLET && (
              <TabsTrigger value="month">Month</TabsTrigger>
            )}
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </TabsRoot>
      </div>

      {touchReschedule && (
        <p className="text-xs text-muted-foreground">
          Tap a post to reschedule. Drag-and-drop is available on desktop.
        </p>
      )}

      <PostStatusLegend />

      {view === 'month' && (
        <div className="rounded-hyve-lg border border-neutral-200">
          <div className="grid grid-cols-7 border-b border-neutral-200 bg-paper-alt">
            {WEEKDAYS.map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          {renderDayGrid(monthDays)}
        </div>
      )}

      {view === 'week' && (
        <div className="rounded-hyve-lg border border-neutral-200 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 border-b border-neutral-200 bg-paper-alt">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="p-2 text-center text-xs font-medium text-muted-foreground">
                  {format(day, 'EEE d')}
                </div>
              ))}
            </div>
            {renderDayGrid(weekDays, { tall: true })}
          </div>
        </div>
      )}

      <CalendarRescheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        post={reschedulePost}
        clientTimezone={activeClient?.default_timezone}
        onConfirm={handleRescheduleConfirm}
        saving={rescheduling}
      />
    </div>
  );
}
