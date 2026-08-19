import { getServiceClient } from './supabase.ts';

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export function isProSubscription(plan: string | null | undefined, status: string | null | undefined) {
  return plan === 'pro' && !!status && ACTIVE_STATUSES.has(status);
}

export async function assertOrgHasProPlan(
  service: ReturnType<typeof getServiceClient>,
  orgId: string,
  feature = 'This feature',
): Promise<void> {
  const { data, error } = await service
    .from('organizations')
    .select('plan, subscription_status')
    .eq('id', orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Organization not found');
  if (!isProSubscription(data.plan as string, data.subscription_status as string)) {
    throw new Error(`${feature} requires the Pro plan`);
  }
}
