import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { assertPlatformAdmin, logAdminEvent } from '../_shared/platformAdmin.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

const VALID_PLANS = new Set(['starter', 'pro', null]);
const VALID_STATUSES = new Set(['none', 'trialing', 'active', 'past_due', 'canceled']);

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { user } = await requireUser(req);
    const service = getServiceClient();
    await assertPlatformAdmin(service, user.id);

    const body = await req.json().catch(() => ({}));
    const orgId = body.organizationId as string;
    const plan = body.plan === null || body.plan === '' ? null : String(body.plan);
    const subscriptionStatus = String(body.subscription_status || body.subscriptionStatus || '');
    const periodEnd = body.subscription_current_period_end as string | null | undefined;

    if (!orgId) return jsonResponse({ error: 'organizationId required' }, 400);
    if (!VALID_PLANS.has(plan)) return jsonResponse({ error: 'Invalid plan' }, 400);
    if (!VALID_STATUSES.has(subscriptionStatus)) {
      return jsonResponse({ error: 'Invalid subscription_status' }, 400);
    }

    const payload: Record<string, unknown> = {
      plan,
      subscription_status: subscriptionStatus,
    };
    if (periodEnd !== undefined) {
      payload.subscription_current_period_end = periodEnd || null;
    }

    const { data, error } = await service
      .from('organizations')
      .update(payload)
      .eq('id', orgId)
      .select('*')
      .single();

    if (error) throw error;

    await logAdminEvent(service, {
      actorUserId: user.id,
      action: 'organization_plan_updated',
      targetType: 'organization',
      targetId: orgId,
      metadata: payload,
    });

    return jsonResponse({ organization: data });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Forbidden' ? 403
      : message === 'Unauthorized' || message === 'Missing authorization' ? 401
      : 400;
    return jsonResponse({ error: message }, status);
  }
});
