import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TabsRoot, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const STATUS_VARIANT = {
  draft: 'draft',
  scheduled: 'scheduled',
  publishing: 'publishing',
  published: 'published',
  failed: 'failed',
};

export function ContentCalendar({ posts = [] }) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getPostsForDay = (day) =>
    posts.filter((p) => {
      const date = p.scheduled_at || p.created_at;
      return date && isSameDay(new Date(date), day);
    });

  const PostChip = ({ post }) => (
    <button
      type="button"
      onClick={() => navigate(`/app/posts/${post.id}`)}
      className="mb-1 w-full truncate rounded px-1.5 py-0.5 text-left text-xs hover:opacity-80"
    >
      <Badge variant={STATUS_VARIANT[post.status] || 'default'} className="mr-1 text-[10px]">
        {post.status}
      </Badge>
      {post.caption?.slice(0, 30) || 'Untitled'}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </TabsRoot>
      </div>

      {view === 'month' ? (
        <div className="rounded-lg border">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
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
                    'min-h-[100px] border-b border-r p-2',
                    !isSameMonth(day, currentDate) && 'bg-muted/30 text-muted-foreground'
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
                    <PostChip key={post.id} post={post} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="p-2 text-center">
                <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                <div className="text-lg font-semibold">{format(day, 'd')}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weekDays.map((day) => {
              const dayPosts = getPostsForDay(day);
              return (
                <div key={day.toISOString()} className="min-h-[200px] border-r p-2 last:border-r-0">
                  <button
                    type="button"
                    className="mb-2 text-xs text-primary hover:underline"
                    onClick={() => navigate(`/app/posts/new?date=${day.toISOString()}`)}
                  >
                    + New post
                  </button>
                  {dayPosts.map((post) => (
                    <PostChip key={post.id} post={post} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
