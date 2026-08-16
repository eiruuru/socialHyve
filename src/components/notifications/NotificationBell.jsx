import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationsContext } from '@/lib/notifications/NotificationsProvider';
import { NotificationPanel } from './NotificationPanel';
import { requestPushPermission } from '@/lib/pushNotifications';

const PANEL_WIDTH = 360;

function usePanelPosition(open, anchorRef) {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !anchorRef.current) {
      setStyle(null);
      return undefined;
    }

    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const width = Math.min(PANEL_WIDTH, window.innerWidth - 16);
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - width - 8,
      );
      setStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left,
        width,
        zIndex: 9999,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef]);

  return style;
}

export function NotificationBell({ className, variant = 'icon' }) {
  const {
    unreadCount,
    open,
    setOpen,
    inAppEnabled,
  } = useNotificationsContext();
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const pushPrompted = useRef(false);
  const panelStyle = usePanelPosition(open, buttonRef);

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

  const isIcon = variant === 'icon';

  const panel = open && panelStyle && createPortal(
    <div ref={panelRef} style={panelStyle}>
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
    </div>,
    document.body,
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleBellClick}
        className={cn(
          'relative rounded-hyve-sm transition-colors',
          isIcon
            ? cn(
                'flex h-9 w-9 items-center justify-center',
                open
                  ? 'bg-sidebar-accent text-white'
                  : 'text-neutral-200 hover:bg-sidebar-accent hover:text-white',
                !inAppEnabled && 'opacity-70',
              )
            : cn(
                'flex w-full min-h-9 items-center gap-3 px-3 py-2 text-sm font-medium',
                open ? 'bg-sidebar-accent text-white' : 'text-neutral-200 hover:bg-sidebar-accent hover:text-white',
                !inAppEnabled && 'opacity-70',
              ),
          className,
        )}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell className={cn('shrink-0', isIcon ? 'h-5 w-5' : 'h-4 w-4')} />
        {!isIcon && <span>Notifications</span>}
        {inAppEnabled && unreadCount > 0 && (
          <span
            className={cn(
              'flex items-center justify-center rounded-full bg-honey text-[10px] font-bold text-white',
              isIcon
                ? 'absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1'
                : 'absolute -right-1.5 -top-1.5 h-4 min-w-4 px-1',
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </>
  );
}
