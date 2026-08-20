import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { clearModalLocks } from '@/lib/clearModalLocks';
import { formatScheduledLabel } from '@/lib/scheduleTime';

export function DuplicatePostSuccessDialog({ post, open, onOpenChange }) {
  if (!open && !post) return null;

  const scheduleLabel = post?.scheduled_at
    ? formatScheduledLabel(post.scheduled_at, post.schedule_timezone)
    : null;

  const handleOpenCopyClick = () => {
    clearModalLocks();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      {post ? (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post duplicated</DialogTitle>
            <DialogDescription>
              A new draft copy was created
              {scheduleLabel ? ` with the same schedule (${scheduleLabel}).` : '.'}
              {' '}Open it in the editor when you&apos;re ready.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button asChild>
              <Link
                to={`/app/posts/${post.id}/edit`}
                onClick={handleOpenCopyClick}
              >
                Open copy
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
