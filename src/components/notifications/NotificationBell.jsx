import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationsContext } from '@/lib/notifications/NotificationsProvider';
import { NotificationPanel } from './NotificationPanel';
import { requestPushPermission } from '@/lib/pushNotifications';

export function NotificationBell({ className, panelPlacement = 'right' }) {
  const {
    unreadCount,
    open,
    setOpen,
    inAppEnabled,
  } = useNotificationsContext();
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const pushPrompted = useRef(false);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (
        panelRef.current?.contains(event.target)
        || buttonRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, setOpen]);

  const handleBellClick = () => {
    if (
      inAppEnabled
      && !pushPrompted.current
      && typeof Notification !== 'undefined'
      && Notification.permission === 'default'
    ) {
      pushPrompted.current = true;
      requestPushPermission().catch(() => {});
    }
    setOpen(!open);
  };

  const panelClass = panelPlacement === 'right'
    ? 'absolute left-full top-0 z-50 ml-2 w-[min(360px,calc(100vw-15rem))]'
    : 'absolute bottom-full left-3 right-3 z-50 mb-2';

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleBellClick}
        className={cn(
          'flex w-full min-h-9 items-center gap-3 rounded-hyve-sm px-3 py-2 text-sm font-medium transition-colors',
          open ? 'bg-sidebar-accent text-white' : 'text-neutral-200 hover:bg-sidebar-accent hover:text-white',
          !inAppEnabled && 'opacity-70',
        )}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <span className="relative">
          <Bell className="h-4 w-4 shrink-0" />
          {inAppEnabled && unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-honey px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
        <span>Notifications</span>
      </button>
      {open && (
        <div ref={panelRef} className={panelClass}>
          {!inAppEnabled ? (
            <div className="rounded-hyve-md border border-neutral-200 bg-white p-4 shadow-hyve-lg">
              <p className="text-sm font-medium text-neutral-900">In-app alerts are off</p>
              <p className="mt-1 text-sm text-neutral-600">
                Turn them on in Account settings to see invites and review updates here.
              </p>
              <Link
                to="/app/settings/account"
                onClick={() => setOpen(false)}
                className="mt-3 inline-block text-sm font-medium text-honey-dark hover:underline"
              >
                Open Account settings
              </Link>
            </div>
          ) : (
            <NotificationPanel onClose={() => setOpen(false)} />
          )}
        </div>
      )}
    </div>
  );
}
