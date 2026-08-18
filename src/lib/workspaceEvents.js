import { supabase } from './supabase';
import { getOrganization } from './organization';
import { getCurrentWorkspaceId } from './workspace';

export const WORKSPACE_ACTION_LABELS = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  published: 'Published',
  publish_failed: 'Publish failed',
  scheduled: 'Scheduled',
  rescheduled: 'Rescheduled',
  unscheduled: 'Unscheduled',
  member_added: 'Member added',
  invite_sent: 'Invite sent',
  client_deleted: 'Client deleted',
};

export const WORKSPACE_ENTITY_LABELS = {
  post: 'Post',
  client: 'Client',
  member: 'Member',
  invite: 'Invite',
  integration: 'Integration',
  system: 'System',
};

export function buildPostEntityLabel(post) {
  const name = post?.internal_name?.trim();
  if (name) return name;
  const caption = post?.caption?.trim();
  if (caption) return caption.length > 80 ? `${caption.slice(0, 77)}…` : caption;
  return 'Untitled post';
}

export async function logWorkspaceEvent({
  organizationId,
  clientId,
  actorUserId,
  entityType,
  entityId,
  entityLabel,
  action,
  detail,
  metadata,
} = {}) {
  try {
    const orgId = organizationId ?? await getCurrentWorkspaceId();
    if (!orgId) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('workspace_events').insert({
      organization_id: orgId,
      client_id: clientId ?? null,
      actor_user_id: actorUserId ?? user?.id ?? null,
      entity_type: entityType,
      entity_id: entityId ?? null,
      entity_label: entityLabel ?? null,
      action,
      detail: detail ?? null,
      metadata: metadata ?? {},
    });
    if (error) console.warn('workspace event log failed:', error.message);
  } catch (err) {
    console.warn('workspace event log failed:', err.message);
  }
}

export async function listWorkspaceEvents({
  clientId,
  action,
  search,
  limit = 50,
  offset = 0,
} = {}) {
  const org = await getOrganization();
  if (!org) return { events: [], total: 0 };

  let query = supabase
    .from('workspace_events')
    .select('*', { count: 'exact' })
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (clientId) query = query.eq('client_id', clientId);
  if (action) query = query.eq('action', action);
  if (search?.trim()) query = query.ilike('entity_label', `%${search.trim()}%`);

  const { data: events, error, count } = await query;
  if (error) throw error;

  const rows = events || [];
  const actorIds = [...new Set(rows.map((e) => e.actor_user_id).filter(Boolean))];
  let profileMap = {};
  if (actorIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', actorIds);
    profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  }

  const postIds = rows
    .filter((e) => e.entity_type === 'post' && e.entity_id)
    .map((e) => e.entity_id);
  let existingPostIds = new Set();
  if (postIds.length) {
    const { data: existingPosts } = await supabase
      .from('posts')
      .select('id')
      .in('id', postIds);
    existingPostIds = new Set((existingPosts || []).map((p) => p.id));
  }

  return {
    events: rows.map((event) => ({
      ...event,
      actor: event.actor_user_id ? profileMap[event.actor_user_id] : null,
      entityExists: event.entity_type !== 'post'
        || !event.entity_id
        || existingPostIds.has(event.entity_id),
    })),
    total: count ?? 0,
  };
}
