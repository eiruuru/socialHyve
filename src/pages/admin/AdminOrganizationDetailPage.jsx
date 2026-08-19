import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminOrganization, updateAdminOrganizationPlan } from '@/lib/admin';
import { PLAN_IDS } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/lib/toast';

const STATUS_OPTIONS = ['none', 'trialing', 'active', 'past_due', 'canceled'];

export default function AdminOrganizationDetailPage() {
  const { orgId } = useParams();
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('none');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-organization', orgId],
    queryFn: () => getAdminOrganization(orgId),
    enabled: !!orgId,
  });

  const org = data?.organization;
  const members = data?.members ?? [];
  const clients = data?.clients ?? [];

  useEffect(() => {
    if (!org) return;
    setPlan(org.plan || '');
    setSubscriptionStatus(org.subscription_status || 'none');
  }, [org]);

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAdminOrganizationPlan({
        organizationId: orgId,
        plan: plan || null,
        subscription_status: subscriptionStatus,
      });
      showToast({ title: 'Plan updated', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['admin-organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
    } catch (err) {
      showToast({ title: 'Could not update plan', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/app/admin/organizations">← Organizations</Link>
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !org ? (
        <p className="text-sm text-muted-foreground">Organization not found.</p>
      ) : (
        <>
          <div>
            <h2 className="font-display text-xl font-bold">{org.name}</h2>
            <p className="text-sm text-muted-foreground">
              Owner: {data.owner?.email || org.owner_id}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Billing override</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePlan} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Plan</span>
                  <select
                    className="block w-full min-w-[10rem] rounded-hyve-sm border border-input bg-background px-3 py-2"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                  >
                    <option value="">No plan</option>
                    <option value={PLAN_IDS.STARTER}>Starter</option>
                    <option value={PLAN_IDS.PRO}>Pro</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Subscription status</span>
                  <select
                    className="block w-full min-w-[10rem] rounded-hyve-sm border border-input bg-background px-3 py-2 capitalize"
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save billing'}
                </Button>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">
                Manual override only — does not call Creem. Use for support comps or corrections.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team members ({members.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {members.map((member) => (
                <div key={member.user_id} className="flex justify-between gap-4 border-b border-neutral-100 py-2 last:border-0">
                  <span>{member.profiles?.email || member.user_id}</span>
                  <span className="capitalize text-muted-foreground">{member.role}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clients ({clients.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {clients.map((client) => (
                <div key={client.id} className="py-1">{client.name}</div>
              ))}
              {!clients.length ? <p className="text-muted-foreground">No clients.</p> : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
