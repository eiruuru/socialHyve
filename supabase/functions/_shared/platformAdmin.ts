import { getServiceClient } from './supabase.ts';

const BOOTSTRAP_EMAILS = new Set([
  'jhinadwin@gmail.com',
  ...(Deno.env.get('PLATFORM_ADMIN_EMAILS') || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
]);

export async function isPlatformAdmin(
  service: ReturnType<typeof getServiceClient>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await service
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function assertPlatformAdmin(
  service: ReturnType<typeof getServiceClient>,
  userId: string,
): Promise<void> {
  if (!(await isPlatformAdmin(service, userId))) {
    throw new Error('Forbidden');
  }
}

export async function bootstrapPlatformAdminIfEligible(
  service: ReturnType<typeof getServiceClient>,
  userId: string,
  email?: string | null,
): Promise<boolean> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !BOOTSTRAP_EMAILS.has(normalized)) return false;

  const { error } = await service
    .from('platform_admins')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });
  if (error) throw error;
  return true;
}

export async function logAdminEvent(
  service: ReturnType<typeof getServiceClient>,
  params: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await service.from('admin_events').insert({
    actor_user_id: params.actorUserId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    metadata: params.metadata ?? {},
  });
}

export function generateTempPassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}
