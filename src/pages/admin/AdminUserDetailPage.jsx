import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminUser } from '@/lib/admin';
import { getPlanLabel } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminAccountPanel } from '@/features/admin/AdminAccountPanel';
import { AdminOrgMembershipsPanel } from '@/features/admin/AdminOrgMembershipsPanel';
import { AdminClientMembershipsPanel } from '@/features/admin/AdminClientMembershipsPanel';

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => getAdminUser(userId),
    enabled: !!userId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const profile = data?.profile;
  const primaryOrg = data?.ownedOrganizations?.[0]
    || data?.organizationMemberships?.[0]?.organizations;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/app/admin/users">← Users</Link>
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{error?.message || 'Could not load user.'}</p>
      ) : !profile ? (
        <p className="text-sm text-muted-foreground">User not found.</p>
      ) : (
        <>
          <div>
            <h2 className="font-display text-xl font-bold">{profile.full_name || profile.email}</h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>

          <AdminAccountPanel user={data} onUpdated={refresh} />

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminOrgMembershipsPanel user={data} onUpdated={refresh} />
            <AdminClientMembershipsPanel user={data} onUpdated={refresh} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Primary workspace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Organization:</span>{' '}
                  {primaryOrg ? (
                    <Link
                      to={`/app/admin/organizations/${primaryOrg.id}`}
                      className="font-medium hover:underline"
                    >
                      {primaryOrg.name}
                    </Link>
                  ) : '—'}
                </p>
                <p><span className="text-muted-foreground">Plan:</span> {getPlanLabel(primaryOrg?.plan)}</p>
                <p className="capitalize">
                  <span className="text-muted-foreground normal-case">Status:</span>{' '}
                  {primaryOrg?.subscription_status?.replace('_', ' ') || 'none'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Queue summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                <div>Draft: {data.queueSummary?.draft ?? 0}</div>
                <div>Pending: {data.queueSummary?.pending ?? 0}</div>
                <div>Approved: {data.queueSummary?.approved ?? 0}</div>
                <div>Scheduled: {data.queueSummary?.scheduled ?? 0}</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
