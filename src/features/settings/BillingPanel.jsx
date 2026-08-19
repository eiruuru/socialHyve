import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createCheckout, getOrganizationBilling } from '@/lib/billing';
import { useMembership } from '@/lib/membershipContext';
import {
  getPlanLabel,
  isActiveSubscription,
  isProPlan,
  PLAN_IDS,
  PLANS,
  SUPPORT_EMAIL,
} from '@/lib/plans';
import { showToast } from '@/lib/toast';

export function BillingPanel() {
  const { organizationId, isOwnerOrAdmin } = useMembership();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busyPlan, setBusyPlan] = useState(null);
  const planCheckoutStarted = useRef(false);

  const handleCheckout = async (plan) => {
    setBusyPlan(plan);
    try {
      const url = await createCheckout(plan);
      window.location.href = url;
    } catch (err) {
      showToast({ title: 'Checkout failed', description: err.message, variant: 'error' });
      setBusyPlan(null);
    }
  };

  const { data: billing, isLoading } = useQuery({
    queryKey: ['organization-billing', organizationId],
    queryFn: () => getOrganizationBilling(organizationId),
    enabled: !!organizationId && isOwnerOrAdmin,
  });

  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') return;
    showToast({
      title: 'Subscription updated',
      description: 'Your plan should reflect shortly. Questions? Email us.',
      variant: 'success',
    });
    queryClient.invalidateQueries({ queryKey: ['organization-billing', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['membership-billing'] });
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, queryClient, organizationId]);

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (planCheckoutStarted.current || !plan || !isOwnerOrAdmin) return;
    if (plan !== PLAN_IDS.STARTER && plan !== PLAN_IDS.PRO) return;
    planCheckoutStarted.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete('plan');
    setSearchParams(next, { replace: true });
    handleCheckout(plan);
  }, [searchParams, isOwnerOrAdmin, setSearchParams]);

  if (!isOwnerOrAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Only organization owners and admins can manage billing.
      </p>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading billing…</p>;
  }

  const plan = billing?.plan;
  const status = billing?.subscription_status || 'none';
  const active = isActiveSubscription(status);
  const onPro = isProPlan(plan, status);
  const renews = billing?.subscription_current_period_end
    ? new Date(billing.subscription_current_period_end).toLocaleDateString()
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            Subscriptions are billed monthly through Creem. Need help?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-honey-dark hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-hyve-sm border border-neutral-200 bg-paper-alt p-4">
            <p className="font-display text-lg font-bold">
              {active ? getPlanLabel(plan) : 'No active subscription'}
            </p>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              Status: {status.replace('_', ' ')}
              {renews ? ` · Renews ${renews}` : null}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {!onPro ? (
              <Button
                onClick={() => handleCheckout(PLAN_IDS.PRO)}
                disabled={!!busyPlan}
              >
                {busyPlan === PLAN_IDS.PRO ? 'Redirecting…' : `Upgrade to Pro (${PLANS.pro.priceLabel}/mo)`}
              </Button>
            ) : null}
            {plan !== PLAN_IDS.STARTER ? (
              <Button
                variant="outline"
                onClick={() => handleCheckout(PLAN_IDS.STARTER)}
                disabled={!!busyPlan}
              >
                {busyPlan === PLAN_IDS.STARTER ? 'Redirecting…' : `Switch to Starter (${PLANS.starter.priceLabel}/mo)`}
              </Button>
            ) : null}
            <Button variant="ghost" asChild>
              <Link to="/pricing">Compare plans</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            To cancel or update payment details, email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-ink">
              {SUPPORT_EMAIL}
            </a>
            . Receipts are sent by Creem to your billing email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
