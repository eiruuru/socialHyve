import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listAdminOrganizations, listWaitlistRequests } from '@/lib/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminDashboardPage() {
  const { data: waitlistData, isLoading: loadingWaitlist } = useQuery({
    queryKey: ['admin-waitlist', 'pending'],
    queryFn: () => listWaitlistRequests('pending'),
  });

  const { data: orgData, isLoading: loadingOrgs } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: listAdminOrganizations,
  });

  const pendingCount = waitlistData?.requests?.length ?? 0;
  const organizations = orgData?.organizations ?? [];
  const planCounts = organizations.reduce((acc, org) => {
    const key = `${org.plan || 'none'} / ${org.subscription_status || 'none'}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending waitlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-display text-3xl font-bold">
            {loadingWaitlist ? '…' : pendingCount}
          </p>
          <Button size="sm" asChild>
            <Link to="/app/admin/waitlist">Review waitlist</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-display text-3xl font-bold">
            {loadingOrgs ? '…' : organizations.length}
          </p>
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/admin/organizations">View all</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Plan breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOrgs ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="space-y-1 text-sm text-neutral-700">
              {Object.entries(planCounts).map(([label, count]) => (
                <li key={label} className="flex justify-between gap-4">
                  <span className="capitalize">{label}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
              {!Object.keys(planCounts).length ? (
                <li className="text-muted-foreground">No organizations yet.</li>
              ) : null}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
