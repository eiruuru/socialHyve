import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export type WorkspaceEntityType = 'post' | 'client' | 'member' | 'invite' | 'integration' | 'system';

export function buildPostEntityLabel(post: Record<string, unknown>): string {
  const name = String(post.internal_name || '').trim();
  if (name) return name;
  const caption = String(post.caption || '').trim();
  if (caption) return caption.length > 80 ? `${caption.slice(0, 77)}…` : caption;
  return 'Untitled post';
}

export async function logWorkspaceEvent(
  service: SupabaseClient,
  payload: {
    organizationId: string;
    clientId?: string | null;
    actorUserId?: string | null;
    entityType: WorkspaceEntityType;
    entityId?: string | null;
    entityLabel?: string | null;
    action: string;
    detail?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { error } = await service.from('workspace_events').insert({
      organization_id: payload.organizationId,
      client_id: payload.clientId ?? null,
      actor_user_id: payload.actorUserId ?? null,
      entity_type: payload.entityType,
      entity_id: payload.entityId ?? null,
      entity_label: payload.entityLabel ?? null,
      action: payload.action,
      detail: payload.detail ?? null,
      metadata: payload.metadata ?? {},
    });
    if (error) console.warn('workspace event log failed:', error.message);
  } catch (err) {
    console.warn('workspace event log failed:', (err as Error).message);
  }
}
