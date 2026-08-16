import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type WorkflowEvent =
  | 'submitted_for_review'
  | 'approved'
  | 'changes_requested'
  | 'publish_failed';

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
  await invokeWorkflowEmail('publish_failed', post.id as string, [...recipients]);
}
