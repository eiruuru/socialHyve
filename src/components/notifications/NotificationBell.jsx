import { useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationsContext } from '@/lib/notifications/NotificationsProvider';
import { NotificationPanel } from './NotificationPanel';
import { requestPushPermission } from '@/lib/pushNotifications';

export function NotificationBell() {
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

  if (!inAppEnabled) return null;

  const handleBellClick = () => {
    if (!pushPrompted.current && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      pushPrompted.current = true;
      requestPushPermission().catch(() => {});
    }
    setOpen(!open);
  };

  return (
    <div className="relative px-3 pb-2">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleBellClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-hyve-sm px-3 py-2 text-sm text-neutral-200 transition-colors',
          open ? 'bg-sidebar-accent text-white' : 'hover:bg-sidebar-accent hover:text-white',
        )}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <span className="relative">
          <Bell className="h-4 w-4 shrink-0" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-honey px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
        <span>Notifications</span>
      </button>
      {open && (
        <div ref={panelRef} className="absolute bottom-full left-3 right-3 z-50 mb-2">
          <NotificationPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
