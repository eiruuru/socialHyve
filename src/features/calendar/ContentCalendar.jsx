import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  compareAsc,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useClient } from '@/lib/clientContext';
import { reschedulePostToDay } from '@/lib/posts';
import { CalendarPostCard, isPostDraggable } from './CalendarPostCard';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { TabsRoot, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { buildPostNavSearch } from '@/features/posts/postNavUtils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function mondayStartWeek(date) {
  const d = startOfWeek(date, { weekStartsOn: 1 });
  return d;
}

function mondayEndWeek(date) {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function ContentCalendar({ posts = [] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeClient } = useClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [draggingPostId, setDraggingPostId] = useState(null);
  const [dropTargetDay, setDropTargetDay] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = mondayStartWeek(monthStart);
  const calendarEnd = mondayEndWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getPostsForDay = (day) =>
    posts.filter((p) => {
      const date = p.scheduled_at || p.created_at;
      return date && isSameDay(new Date(date), day);
    });

  const calendarMonth = format(currentDate, 'yyyy-MM');
  const monthNavSearch = buildPostNavSearch({ nav: 'calendar', month: calendarMonth });
  const listNavSearch = buildPostNavSearch({ nav: 'calendar' });

  const sortedPosts = [...posts].sort((a, b) => {
    const da = a.scheduled_at || a.created_at;
    const db = b.scheduled_at || b.created_at;
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return compareAsc(new Date(da), new Date(db));
  });

  const handleDragStart = (_e, post) => {
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

    const currentDate = post.scheduled_at || post.created_at;
    if (currentDate && isSameDay(new Date(currentDate), day)) {
      setDraggingPostId(null);
      return;
    }

    setRescheduling(true);
    try {
      await reschedulePostToDay(postId, day, post, activeClient?.default_timezone);
      await queryClient.invalidateQueries({ queryKey: ['posts', activeClient?.id] });
    } catch (err) {
      console.error('Failed to reschedule post:', err);
    } finally {
      setRescheduling(false);
      setDraggingPostId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Calendar</p>
          <h2 className="font-display text-xl font-bold">{activeClient?.name || 'All posts'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <IconTooltip title="Previous month" description="Go to the previous month">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </IconTooltip>
          <h3 className="min-w-[180px] text-center text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <IconTooltip title="Next month" description="Go to the next month">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </IconTooltip>
        </div>
        <TabsRoot value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
        </TabsRoot>
      </div>

      {view === 'month' ? (
        <div className="rounded-hyve-lg border border-neutral-200">
          <div className="grid grid-cols-7 border-b border-neutral-200 bg-paper-alt">
            {WEEKDAYS.map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayPosts = getPostsForDay(day);
              const isDropTarget = dropTargetDay && isSameDay(dropTargetDay, day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[180px] border-b border-r border-neutral-200 p-2 transition-colors',
                    !isSameMonth(day, currentDate) && 'bg-neutral-50 text-muted-foreground',
                    isDropTarget && 'bg-honey-light/30 ring-2 ring-inset ring-honey',
                  )}
                  onDragOver={(e) => {
                    if (!draggingPostId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDropTargetDay(day);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setDropTargetDay((current) =>
                        current && isSameDay(current, day) ? null : current,
                      );
                    }
                  }}
                  onDrop={(e) => handleDropOnDay(day, e)}
                >
                  <button
                    type="button"
                    className="mb-1 text-sm font-medium hover:text-primary"
                    onClick={() => navigate(`/app/posts/new?date=${day.toISOString()}`)}
                  >
                    {format(day, 'd')}
                  </button>
                  {dayPosts.map((post) => (
                    <CalendarPostCard
                      key={post.id}
                      post={post}
                      navSearch={monthNavSearch}
                      draggable={isPostDraggable(post)}
                      isDragging={draggingPostId === post.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts scheduled.</p>
          ) : (
            sortedPosts.map((post) => (
              <div key={post.id} className="flex items-center gap-4 rounded-hyve-md border p-3">
                <div className="w-36 shrink-0 text-sm text-muted-foreground">
                  {post.scheduled_at
                    ? format(new Date(post.scheduled_at), 'MMM d, yyyy · h:mm a')
                    : 'Unscheduled'}
                </div>
                <div className="min-w-0 flex-1">
                  <CalendarPostCard
                    post={post}
                    layout="horizontal"
                    navSearch={listNavSearch}
                    className="mb-0 border-0 shadow-none"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
