import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type WorkflowEvent =
  | 'submitted_for_review'
  | 'approved'
  | 'changes_requested'
  | 'publish_failed'
  | 'publish_success';

type InAppNotification = {
  userId: string;
  type: string;
  event: string;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown>;
};

const EVENT_TITLES: Record<string, string> = {
  submitted_for_review: 'Post submitted for review',
  approved: 'Post approved',
  changes_requested: 'Changes requested',
  publish_failed: 'Publish failed',
  publish_success: 'Post published',
};

const DEFAULT_IN_APP_PREFS: Record<string, boolean> = {
  client_invite: true,
  org_invite: true,
  submitted_for_review: true,
  approved: true,
  changes_requested: true,
  publish_success: true,
  publish_failed: true,
  review_needed: true,
};

async function sendPush(
  userId: string,
  title: string,
  body: string | null | undefined,
  href: string | null | undefined,
): Promise<void> {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) return;

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'send', userId, title, body, href }),
  }).catch(() => {});
}

export async function createInAppNotifications(
  service: SupabaseClient,
  notifications: InAppNotification[],
): Promise<void> {
  for (const n of notifications) {
    if (!n.userId || !n.event || !n.title) continue;

    const { data: profile } = await service
      .from('profiles')
      .select('in_app_notifications_enabled, in_app_notification_preferences')
      .eq('id', n.userId)
      .maybeSingle();

    if (profile?.in_app_notifications_enabled === false) continue;
    const prefs = {
      ...DEFAULT_IN_APP_PREFS,
      ...(profile?.in_app_notification_preferences as Record<string, boolean> | null || {}),
    };
    if (prefs[n.event] === false) continue;

    const { error } = await service.rpc('create_user_notification', {
      p_user_id: n.userId,
      p_type: n.type,
      p_event: n.event,
      p_title: n.title,
      p_body: n.body || null,
      p_href: n.href || null,
      p_metadata: n.metadata || {},
    });
    if (error) continue;

    await sendPush(n.userId, n.title, n.body, n.href);
  }
}

export async function invokeWorkflowEmail(
  event: WorkflowEvent,
  postId: string,
  recipientUserIds: string[],
): Promise<void> {
  if (!recipientUserIds.length) return;

  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-workflow-email`;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) return;

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event, postId, recipientUserIds }),
  }).catch(() => {});
}

export function getPostAuthorUserId(post: Record<string, unknown>): string | null {
  return (post.created_by as string | undefined)
    || (post.assigned_to as string | undefined)
    || null;
}

export async function getOrgAdminUserIds(
  service: SupabaseClient,
  clientId: string | null | undefined,
): Promise<string[]> {
  if (!clientId) return [];

  const { data: client } = await service
    .from('clients')
    .select('organization_id')
    .eq('id', clientId)
    .maybeSingle();
  if (!client?.organization_id) return [];

  const { data: org } = await service
    .from('organizations')
    .select('owner_id')
    .eq('id', client.organization_id)
    .maybeSingle();

  const { data: members } = await service
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', client.organization_id)
    .in('role', ['owner', 'admin']);

  const ids = new Set<string>();
  if (org?.owner_id) ids.add(org.owner_id);
  for (const member of members || []) ids.add(member.user_id);
  return [...ids];
}

export async function notifyPublishFailed(
  service: SupabaseClient,
  post: Record<string, unknown>,
): Promise<void> {
  const recipients = new Set<string>();
  const authorId = getPostAuthorUserId(post);
  if (authorId) recipients.add(authorId);
  for (const adminId of await getOrgAdminUserIds(service, post.client_id as string | undefined)) {
    recipients.add(adminId);
  }
  const recipientList = [...recipients];
  await invokeWorkflowEmail('publish_failed', post.id as string, recipientList);

  const postTitle = (post.internal_name as string) || (post.caption as string)?.slice(0, 80) || null;
  await createInAppNotifications(
    service,
    recipientList.map((userId) => ({
      userId,
      type: 'publish',
      event: 'publish_failed',
      title: EVENT_TITLES.publish_failed,
      body: (post.error_message as string) || postTitle,
      href: `/app/posts/${post.id}`,
      metadata: { postId: post.id },
    })),
  );
}

export async function notifyPublishSuccess(
  service: SupabaseClient,
  post: Record<string, unknown>,
): Promise<void> {
  const recipients = new Set<string>();
  const authorId = getPostAuthorUserId(post);
  if (authorId) recipients.add(authorId);
  for (const adminId of await getOrgAdminUserIds(service, post.client_id as string | undefined)) {
    recipients.add(adminId);
  }

  const postTitle = (post.internal_name as string) || (post.caption as string)?.slice(0, 80) || null;
  await createInAppNotifications(
    service,
    [...recipients].map((userId) => ({
      userId,
      type: 'publish',
      event: 'publish_success',
      title: EVENT_TITLES.publish_success,
      body: postTitle,
      href: `/app/posts/${post.id}`,
      metadata: { postId: post.id },
    })),
  );
}
