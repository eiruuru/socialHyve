import { supabase } from './supabase';
import { invokeFunction } from './supabaseFunctions';
import { PLAN_IDS } from './plans';

export async function createCheckout(plan) {
  if (plan !== PLAN_IDS.STARTER && plan !== PLAN_IDS.PRO) {
    throw new Error('Invalid plan');
  }
  const result = await invokeFunction('creemCreateCheckout', { plan });
  if (!result?.checkoutUrl) {
    throw new Error(result?.error || 'Could not start checkout');
  }
  return result.checkoutUrl;
}

export async function getOrganizationBilling(organizationId) {
  if (!organizationId) return null;
  const { data, error } = await supabase
    .from('organizations')
    .select('id, plan, subscription_status, subscription_current_period_end, creem_customer_id, creem_subscription_id')
    .eq('id', organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
