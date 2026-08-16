import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useMembership } from '@/lib/membershipContext';
import {
  acceptInvite,
  declineClientInvite,
  listMyPendingClientInvites,
} from '@/lib/organization';
import { showToast } from '@/lib/toast';
import {
  clearInviteToastState,
  markInviteToastShown,
  shouldShowInviteToast,
  snoozeInviteToast,
  INVITE_TOAST_WINDOW_MS,
} from '@/lib/inviteToastStorage';
import { useNotificationsContext } from '@/lib/notifications/NotificationsProvider';

const POLL_MS = 20000;

function formatHoursRemaining(invite) {
  const createdAt = new Date(invite.created_at).getTime();
  const endsAt = createdAt + INVITE_TOAST_WINDOW_MS;
  const hoursLeft = Math.max(1, Math.ceil((endsAt - Date.now()) / (60 * 60 * 1000)));
  return hoursLeft;
}

export function PendingClientInviteNotifier() {
  const { user } = useAuth();
  const { refreshMembership } = useMembership();
  const queryClient = useQueryClient();
  const { isInviteRead, markRead, refresh } = useNotificationsContext();

  useEffect(() => {
    if (!user?.email) return undefined;

    let cancelled = false;

    const check = async () => {
      try {
        const invites = await listMyPendingClientInvites();
        if (cancelled) return;

        for (const invite of invites) {
          const inviteKey = `client-invite-${invite.id}`;
          if (isInviteRead(inviteKey)) continue;
          if (!shouldShowInviteToast(invite)) continue;

          markInviteToastShown(invite);

          const clientName = invite.clients?.name || 'a client';
          const hoursLeft = formatHoursRemaining(invite);

          showToast({
            toastId: `client-invite-${invite.id}`,
            title: `Invitation to ${clientName}`,
            description: `You were invited as ${invite.role}. Accept to access their review queue. Available for ${hoursLeft} more hour${hoursLeft === 1 ? '' : 's'}.`,
            variant: 'info',
            duration: 0,
            onDismiss: () => {
              snoozeInviteToast(invite.id);
              markRead({ key: inviteKey, derived: true }).catch(() => {});
            },
            actions: [
              {
                label: 'Accept',
                onClick: async () => {
                  try {
                    const result = await acceptInvite(invite.token, 'client');
                    clearInviteToastState(invite.id);
                    await markRead({ key: inviteKey, derived: true });
                    await refreshMembership();
                    queryClient.invalidateQueries({ queryKey: ['client-members'] });
                    refresh();
                    showToast({
                      title: `Joined ${clientName}`,
                      description: 'You can review posts from the sidebar.',
                      variant: 'success',
                    });
                    if (result?.redirectTo) {
                      window.location.assign(result.redirectTo);
                    }
                  } catch (err) {
                    showToast({
                      title: 'Could not accept invite',
                      description: err.message,
                      variant: 'error',
                    });
                  }
                },
              },
              {
                label: 'Decline',
                variant: 'outline',
                onClick: async () => {
                  try {
                    await declineClientInvite(invite.id);
                    clearInviteToastState(invite.id);
                    await markRead({ key: inviteKey, derived: true });
                    refresh();
                    showToast({ title: 'Invitation declined', variant: 'info' });
                  } catch (err) {
                    showToast({
                      title: 'Could not decline invite',
                      description: err.message,
                      variant: 'error',
                    });
                  }
                },
              },
              {
                label: 'Later',
                variant: 'outline',
                onClick: async () => {
                  snoozeInviteToast(invite.id);
                  await markRead({ key: inviteKey, derived: true });
                },
              },
            ],
          });
        }
      } catch {
        // ignore polling errors
      }
    };

    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.email, refreshMembership, queryClient, isInviteRead, markRead, refresh]);

  return null;
}
