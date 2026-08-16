import { format, isSameDay, isSameMonth, startOfDay } from 'date-fns';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CalendarPostCard, isPostDraggable } from './CalendarPostCard';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { isPastCalendarDay } from '@/lib/scheduleTime';
import { cn } from '@/lib/utils';

export function CalendarDayCell({
  day,
  dayPosts,
  currentDate,
  readOnly,
  navSearch,
  draggingPostId,
  dropTargetDay,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  tall = false,
}) {
  const navigate = useNavigate();
  const isPastDay = isPastCalendarDay(day);
  const isDropTarget = dropTargetDay && isSameDay(dropTargetDay, day);
  const isToday = isSameDay(startOfDay(day), startOfDay(new Date()));

  return (
    <div
      className={cn(
        'border-b border-r border-neutral-200 p-2 transition-colors',
        tall ? 'min-h-[320px]' : 'min-h-[180px]',
        !isSameMonth(day, currentDate) && 'bg-neutral-50 text-muted-foreground',
        isPastDay && 'bg-neutral-100/80',
        isDropTarget && !isPastDay && 'bg-honey-light/30 ring-2 ring-inset ring-honey',
      )}
      onDragOver={readOnly ? undefined : onDragOver}
      onDragLeave={readOnly ? undefined : onDragLeave}
      onDrop={readOnly ? undefined : onDrop}
    >
      <div className="mb-2.5 flex items-center justify-between gap-1">
        <span
          className={cn(
            'text-sm font-medium',
            isToday && 'font-bold text-primary',
            isPastDay && 'text-muted-foreground/60',
          )}
        >
          {format(day, 'd')}
        </span>
        {!readOnly && !isPastDay && (
          <IconTooltip
            title="New post"
            description={`Create a post for ${format(day, 'MMM d')}`}
          >
            <button
              type="button"
              onClick={() => navigate(`/app/posts/new?date=${day.toISOString()}`)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-hyve-sm text-muted-foreground transition-colors hover:bg-honey-light hover:text-honey-dark"
              aria-label={`New post on ${format(day, 'MMM d')}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </IconTooltip>
        )}
      </div>
      {dayPosts.map((post) => (
        <CalendarPostCard
          key={post.id}
          post={post}
          navSearch={navSearch}
          draggable={!readOnly && isPostDraggable(post)}
          isDragging={draggingPostId === post.id}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}
