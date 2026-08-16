import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCheck, X } from 'lucide-react';
import { useNotificationsContext } from '@/lib/notifications/NotificationsProvider';
import { formatRelativeTime } from '@/lib/notifications/notificationTypes';
import {
  acceptInvite,
  declineClientInvite,
} from '@/lib/organization';
import { useMembership } from '@/lib/membershipContext';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function NotificationRow({ item, onNavigate, onAcceptClient, onDeclineClient, onAcceptOrg }) {
  const handleClick = () => {
    if (item.invite) return;
    if (item.href) onNavigate(item);
  };

  return (
    <div
      className={cn(
        'border-b border-neutral-100 px-4 py-3 last:border-b-0',
        !item.read && 'bg-amber-50/60',
        item.href && !item.invite && 'cursor-pointer hover:bg-neutral-50',
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && item.href && !item.invite) handleClick();
      }}
      role={item.href && !item.invite ? 'button' : undefined}
      tabIndex={item.href && !item.invite ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-900">{item.title}</p>
          {item.body && (
            <p className="mt-0.5 line-clamp-2 text-xs text-neutral-600">{item.body}</p>
          )}
          <p className="mt-1 text-[10px] text-neutral-400">{formatRelativeTime(item.createdAt)}</p>
        </div>
        {!item.read && (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-honey" aria-hidden />
        )}
      </div>

      {item.invite?.kind === 'client' && (
        <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={() => onAcceptClient(item)}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDeclineClient(item)}>
            Decline
          </Button>
        </div>
      )}

      {item.invite?.kind === 'org' && (
        <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={() => onAcceptOrg(item)}>
            View invite
          </Button>
        </div>
      )}
    </div>
  );
}

export function NotificationPanel({ onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshMembership } = useMembership();
  const {
    items,
    unreadCount,
    markRead,
    markAllRead,
    loading,
  } = useNotificationsContext();

  const handleNavigate = async (item) => {
    if (!item.read) await markRead(item);
    if (item.href) {
      navigate(item.href);
      onClose();
    }
  };

  const handleAcceptClient = async (item) => {
    const invite = item.invite?.invite;
    if (!invite) return;
    try {
      const result = await acceptInvite(invite.token, 'client');
      await markRead(item);
      await refreshMembership();
      queryClient.invalidateQueries({ queryKey: ['client-members'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast({
        title: `Joined ${invite.clients?.name || 'client'}`,
        variant: 'success',
      });
      onClose();
      if (result?.redirectTo) window.location.assign(result.redirectTo);
    } catch (err) {
      showToast({ title: 'Could not accept invite', description: err.message, variant: 'error' });
    }
  };

  const handleDeclineClient = async (item) => {
    const invite = item.invite?.invite;
    if (!invite) return;
    try {
      await declineClientInvite(invite.id);
      await markRead(item);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast({ title: 'Invitation declined', variant: 'info' });
    } catch (err) {
      showToast({ title: 'Could not decline invite', description: err.message, variant: 'error' });
    }
  };

  const handleAcceptOrg = async (item) => {
    await markRead(item);
    onClose();
    navigate(`/app/login?invite=${item.invite.invite.token}`);
  };

  return (
    <div className="overflow-hidden rounded-hyve-md border border-neutral-200 bg-white shadow-hyve-lg">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-neutral-500">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
              title="Mark all as read"
              aria-label="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[min(420px,60vh)] overflow-y-auto">
        {loading && items.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">Loading…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            You&apos;re all caught up.
          </p>
        )}
        {items.map((item) => (
          <NotificationRow
            key={item.key}
            item={item}
            onNavigate={handleNavigate}
            onAcceptClient={handleAcceptClient}
            onDeclineClient={handleDeclineClient}
            onAcceptOrg={handleAcceptOrg}
          />
        ))}
      </div>
    </div>
  );
}
