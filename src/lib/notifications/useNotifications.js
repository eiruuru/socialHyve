import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useMembership } from '@/lib/membershipContext';
import { supabase } from '@/lib/supabase';
import {
  listMyPendingClientInvites,
  listMyPendingOrganizationInvites,
} from '@/lib/organization';
import { listPosts } from '@/lib/posts';
import { formatClientRole, formatRoleLabel } from '@/lib/clientRoles';
import {
  listPersistedNotifications,
  listDerivedReadKeys,
  markNotificationRead,
  markAllNotificationsRead,
  markDerivedRead,
  markAllDerivedRead,
  isInAppEnabled,
  normalizeNotificationItem,
} from './notificationStore';
import { DEFAULT_IN_APP_PREFS } from './notificationTypes';

const INVITE_POLL_MS = 20000;

function buildClientInviteItem(invite, readKeys, profile) {
  if (!isInAppEnabled(profile, 'client_invite')) return null;
  const key = `client-invite-${invite.id}`;
  const clientName = invite.clients?.name || 'a client';
  return normalizeNotificationItem({
    id: key,
    key,
    type: 'invite',
    event: 'client_invite',
    title: `Invitation to ${clientName}`,
    body: `You were invited as ${formatClientRole(invite.role)}.`,
    href: null,
    createdAt: invite.created_at,
    read: readKeys.has(key),
    derived: true,
    invite: { kind: 'client', invite },
  });
}

function buildOrgInviteItem(invite, readKeys, profile) {
  if (!isInAppEnabled(profile, 'org_invite')) return null;
  const key = `org-invite-${invite.id}`;
  const orgName = invite.organizations?.name || 'a team';
  return normalizeNotificationItem({
    id: key,
    key,
    type: 'invite',
    event: 'org_invite',
    title: `Invitation to ${orgName}`,
    body: `You were invited as ${formatRoleLabel(invite.role)}.`,
    href: null,
    createdAt: invite.created_at,
    read: readKeys.has(key),
    derived: true,
    invite: { kind: 'org', invite },
  });
}

function buildReviewItem(post, clientName, readKeys, profile) {
  if (!isInAppEnabled(profile, 'review_needed')) return null;
  const key = `review-${post.id}`;
  const label = post.internal_name || post.caption?.slice(0, 60) || 'Untitled post';
  return normalizeNotificationItem({
    id: key,
    key,
    type: 'review',
    event: 'review_needed',
    title: 'Post awaiting your review',
    body: clientName ? `${label} · ${clientName}` : label,
    href: `/app/client/${post.client_id}/review`,
    createdAt: post.updated_at || post.created_at,
    read: readKeys.has(key),
    derived: true,
  });
}

async function fetchDerivedNotifications(membership, profile) {
  const [clientInvites, orgInvites, readKeys] = await Promise.all([
    listMyPendingClientInvites(),
    listMyPendingOrganizationInvites(),
    listDerivedReadKeys(),
  ]);

  const items = [];

  for (const invite of clientInvites) {
    const item = buildClientInviteItem(invite, readKeys, profile);
    if (item) items.push(item);
  }

  for (const invite of orgInvites) {
    const item = buildOrgInviteItem(invite, readKeys, profile);
    if (item) items.push(item);
  }

  if (membership.isClientOnly && membership.clientMemberships.length) {
    const reviewPosts = await Promise.all(
      membership.clientMemberships.map(async (cm) => {
        const posts = await listPosts({ clientId: cm.clientId });
        return posts
          .filter((p) => ['pending', 'changes_requested'].includes(p.approval_status))
          .map((p) => buildReviewItem(p, cm.name, readKeys, profile))
          .filter(Boolean);
      }),
    );
    items.push(...reviewPosts.flat());
  }

  return { items, readKeys };
}

export function useNotifications(profile) {
  const { user } = useAuth();
  const membership = useMembership();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const prefs = useMemo(
    () => ({ ...DEFAULT_IN_APP_PREFS, ...(profile?.in_app_notification_preferences || {}) }),
    [profile?.in_app_notification_preferences],
  );

  const inAppEnabled = profile?.in_app_notifications_enabled !== false;

  const persistedQuery = useQuery({
    queryKey: ['notifications', 'persisted', user?.id],
    queryFn: listPersistedNotifications,
    enabled: !!user?.id && inAppEnabled,
    refetchInterval: open ? false : 60000,
  });

  const derivedQuery = useQuery({
    queryKey: ['notifications', 'derived', user?.id, membership.clientMemberships],
    queryFn: () => fetchDerivedNotifications(membership, profile),
    enabled: !!user?.id && inAppEnabled,
    refetchInterval: INVITE_POLL_MS,
  });

  useEffect(() => {
    if (!user?.id || !inAppEnabled) return undefined;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'persisted', user.id] });
    };

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        invalidate,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, inAppEnabled, queryClient]);

  const items = useMemo(() => {
    if (!inAppEnabled) return [];

    const persisted = (persistedQuery.data || []).map((row) =>
      normalizeNotificationItem({
        id: row.id,
        key: row.id,
        type: row.type,
        event: row.event,
        title: row.title,
        body: row.body,
        href: row.href,
        createdAt: row.created_at,
        read: !!row.read_at,
        derived: false,
        metadata: row.metadata,
      }),
    );

    const derived = derivedQuery.data?.items || [];
    const merged = [...persisted, ...derived];
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return merged;
  }, [persistedQuery.data, derivedQuery.data?.items, inAppEnabled]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read).length,
    [items],
  );

  const readKeys = derivedQuery.data?.readKeys || new Set();

  const isInviteRead = useCallback(
    (key) => readKeys.has(key),
    [readKeys],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const markRead = useCallback(async (item) => {
    if (item.derived) {
      await markDerivedRead(item.key);
    } else {
      await markNotificationRead(item.id);
    }
    refresh();
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    const derivedKeys = items.filter((i) => i.derived && !i.read).map((i) => i.key);
    await Promise.all([
      markAllNotificationsRead(),
      markAllDerivedRead(derivedKeys),
    ]);
    refresh();
  }, [items, refresh]);

  return {
    items,
    unreadCount,
    open,
    setOpen,
    markRead,
    markAllRead,
    isInviteRead,
    refresh,
    loading: persistedQuery.isLoading || derivedQuery.isLoading,
    inAppEnabled,
    prefs,
  };
}
