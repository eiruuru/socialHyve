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
import { useClient } from '@/lib/clientContext';
import { CalendarPostCard } from './CalendarPostCard';
import { Button } from '@/components/ui/button';
import { TabsRoot, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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
  const { activeClient } = useClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');

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

  const sortedPosts = [...posts].sort((a, b) => {
    const da = a.scheduled_at || a.created_at;
    const db = b.scheduled_at || b.created_at;
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return compareAsc(new Date(da), new Date(db));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Calendar</p>
          <h2 className="font-display text-xl font-bold">{activeClient?.name || 'All posts'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="min-w-[180px] text-center text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
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
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[180px] border-b border-r border-neutral-200 p-2',
                    !isSameMonth(day, currentDate) && 'bg-neutral-50 text-muted-foreground'
                  )}
                >
                  <button
                    type="button"
                    className="mb-1 text-sm font-medium hover:text-primary"
                    onClick={() => navigate(`/app/posts/new?date=${day.toISOString()}`)}
                  >
                    {format(day, 'd')}
                  </button>
                  {dayPosts.map((post) => (
                    <CalendarPostCard key={post.id} post={post} />
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
              <div key={post.id} className="flex items-start gap-4 rounded-hyve-md border p-3">
                <div className="w-28 shrink-0 text-sm text-muted-foreground">
                  {post.scheduled_at
                    ? format(new Date(post.scheduled_at), 'MMM d, yyyy · h:mm a')
                    : 'Unscheduled'}
                </div>
                <div className="min-w-0 flex-1">
                  <CalendarPostCard post={post} className="mb-0 border-0 shadow-none" />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
