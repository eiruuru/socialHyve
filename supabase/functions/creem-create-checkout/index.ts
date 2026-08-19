import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  creemFetch,
  getCreemConfig,
  productIdForPlan,
} from '../_shared/creem.ts';
import { getOrganizationForUser, getServiceClient, requireUser } from '../_shared/supabase.ts';

async function assertBillingAdmin(
  service: ReturnType<typeof getServiceClient>,
  userId: string,
  orgId: string,
) {
  const { data: org } = await service
    .from('organizations')
    .select('owner_id')
    .eq('id', orgId)
    .maybeSingle();
  if (org?.owner_id === userId) return;

  const { data: member } = await service
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (member && ['owner', 'admin'].includes(member.role as string)) return;
  throw new Error('Only organization owners and admins can manage billing');
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { supabase, user } = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan || '').trim();
    const config = getCreemConfig();

    if (!config.apiKey) {
      return jsonResponse({ error: 'CREEM_API_KEY is not configured.' }, 503);
    }

    const productId = productIdForPlan(plan);
    if (!productId) {
      return jsonResponse({ error: 'Invalid plan or CREEM product id not configured.' }, 400);
    }

    const org = await getOrganizationForUser(supabase, user.id);
    if (!org?.id) return jsonResponse({ error: 'Organization not found' }, 404);

    const service = getServiceClient();
    await assertBillingAdmin(service, user.id, org.id);

    const successUrl = `${config.appUrl}/app/settings/account?tab=billing&checkout=success`;
    const payload: Record<string, unknown> = {
      product_id: productId,
      success_url: successUrl,
      metadata: {
        organization_id: org.id,
        plan,
        user_id: user.id,
      },
      customer: {
        email: user.email,
      },
    };

    const checkout = await creemFetch('/checkouts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const checkoutUrl = (checkout as { checkout_url?: string }).checkout_url;
    if (!checkoutUrl) {
      return jsonResponse({ error: 'Creem did not return a checkout URL.' }, 502);
    }

    return jsonResponse({ checkoutUrl, checkoutId: (checkout as { id?: string }).id });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
