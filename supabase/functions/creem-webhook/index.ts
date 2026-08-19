import { jsonResponse } from '../_shared/cors.ts';
import {
  planForProductId,
  verifyCreemSignature,
} from '../_shared/creem.ts';
import { getServiceClient } from '../_shared/supabase.ts';

type CreemWebhookEvent = {
  id?: string;
  eventType?: string;
  object?: Record<string, unknown>;
};

function extractProductId(obj: Record<string, unknown>): string | null {
  const product = obj.product;
  if (typeof product === 'string') return product;
  if (product && typeof product === 'object' && 'id' in product) {
    return String((product as { id?: string }).id || '');
  }
  const order = obj.order as { product?: string } | undefined;
  if (order?.product) return order.product;
  return null;
}

function extractCustomerId(obj: Record<string, unknown>): string | null {
  const customer = obj.customer;
  if (typeof customer === 'string') return customer;
  if (customer && typeof customer === 'object' && 'id' in customer) {
    return String((customer as { id?: string }).id || '');
  }
  const order = obj.order as { customer?: string } | undefined;
  if (order?.customer) return order.customer;
  return null;
}

function extractOrganizationId(obj: Record<string, unknown>): string | null {
  const metadata = obj.metadata as Record<string, unknown> | undefined;
  if (metadata?.organization_id) return String(metadata.organization_id);
  return null;
}

function extractPeriodEnd(obj: Record<string, unknown>): string | null {
  const end = obj.current_period_end_date as string | undefined;
  return end || null;
}

async function upsertBillingEvent(
  service: ReturnType<typeof getServiceClient>,
  event: CreemWebhookEvent,
  organizationId: string | null,
) {
  if (!event.id) return;
  await service.from('billing_events').upsert({
    creem_event_id: event.id,
    organization_id: organizationId,
    event_type: event.eventType || 'unknown',
    payload: event as unknown as Record<string, unknown>,
  }, { onConflict: 'creem_event_id' });
}

async function activateSubscription(
  service: ReturnType<typeof getServiceClient>,
  organizationId: string,
  plan: 'starter' | 'pro',
  status: string,
  customerId: string | null,
  subscriptionId: string | null,
  periodEnd: string | null,
) {
  await service.from('organizations').update({
    plan,
    subscription_status: status,
    creem_customer_id: customerId,
    creem_subscription_id: subscriptionId,
    subscription_current_period_end: periodEnd,
  }).eq('id', organizationId);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('creem-signature');
    await verifyCreemSignature(rawBody, signature);

    const event = JSON.parse(rawBody) as CreemWebhookEvent;
    const eventType = event.eventType || '';
    const obj = (event.object || {}) as Record<string, unknown>;
    const service = getServiceClient();

    let organizationId = extractOrganizationId(obj);
    const productId = extractProductId(obj);
    const plan = planForProductId(productId || '');
    const customerId = extractCustomerId(obj);
    const subscriptionId = typeof obj.id === 'string' && obj.object === 'subscription'
      ? obj.id
      : (obj.subscription as { id?: string } | string | undefined)
        ? typeof obj.subscription === 'string'
          ? obj.subscription
          : (obj.subscription as { id?: string }).id || null
        : null;

    if (!organizationId && customerId) {
      const { data: orgRow } = await service
        .from('organizations')
        .select('id')
        .eq('creem_customer_id', customerId)
        .maybeSingle();
      organizationId = orgRow?.id || null;
    }

    await upsertBillingEvent(service, event, organizationId);

    if (!organizationId) {
      return jsonResponse({ received: true, skipped: 'no organization_id' });
    }

    if (eventType === 'subscription.paid' || eventType === 'checkout.completed') {
      if (!plan) {
        return jsonResponse({ received: true, skipped: 'unknown product' });
      }
      const status = eventType === 'subscription.paid' && obj.status === 'trialing'
        ? 'trialing'
        : 'active';
      await activateSubscription(
        service,
        organizationId,
        plan,
        status,
        customerId,
        subscriptionId,
        extractPeriodEnd(obj),
      );
    } else if (
      eventType === 'subscription.canceled'
      || eventType === 'subscription.expired'
      || eventType === 'subscription.unpaid'
    ) {
      await service.from('organizations').update({
        subscription_status: eventType === 'subscription.canceled' ? 'canceled' : 'canceled',
        subscription_current_period_end: extractPeriodEnd(obj),
      }).eq('id', organizationId);
    } else if (eventType === 'subscription.past_due') {
      await service.from('organizations').update({
        subscription_status: 'past_due',
      }).eq('id', organizationId);
    } else if (eventType === 'subscription.trialing' && plan) {
      await activateSubscription(
        service,
        organizationId,
        plan,
        'trialing',
        customerId,
        subscriptionId,
        extractPeriodEnd(obj),
      );
    }

    return jsonResponse({ received: true });
  } catch (err) {
    console.error('creem-webhook error', err);
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
