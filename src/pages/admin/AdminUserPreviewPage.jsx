import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAdminUserPreview } from '@/lib/admin';
import { getPlanLabel } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminUserPreviewPage() {
  const { userId } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-preview', userId],
    queryFn: () => getAdminUserPreview(userId),
    enabled: !!userId,
  });

  const profile = data?.profile;
  const primaryOrg = data?.ownedOrganizations?.[0]
    || data?.organizationMemberships?.[0]?.organizations;

  return (
    <div className="space-y-6">
      <div className="rounded-hyve-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        Read-only preview — viewing as{' '}
        <span className="font-medium">{profile?.email || userId}</span>
        <div className="mt-2">
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/admin/users">Back to users</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading preview…</p>
      ) : !profile ? (
        <p className="text-sm text-muted-foreground">User not found.</p>
      ) : (
        <>
          <div>
            <h2 className="font-display text-xl font-bold">{profile.full_name || profile.email}</h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workspace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Organization:</span> {primaryOrg?.name || '—'}</p>
                <p><span className="text-muted-foreground">Plan:</span> {getPlanLabel(primaryOrg?.plan)}</p>
                <p className="capitalize">
                  <span className="text-muted-foreground normal-case">Status:</span>{' '}
                  {primaryOrg?.subscription_status?.replace('_', ' ') || 'none'}
                </p>
                <p>
                  <span className="text-muted-foreground">Org role:</span>{' '}
                  {data.organizationMemberships?.[0]?.role || (data.ownedOrganizations?.length ? 'owner' : '—')}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clients ({data.clients?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {(data.clients ?? []).map((client) => (
                <div key={client.id}>{client.name}</div>
              ))}
              {!data.clients?.length ? <p className="text-muted-foreground">No clients in primary org.</p> : null}
            </CardContent>
          </Card>

          {(data.clientMemberships ?? []).length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client member access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.clientMemberships.map((membership) => (
                  <div key={`${membership.client_id}-${membership.role}`} className="flex justify-between gap-4">
                    <span>{membership.clients?.name || membership.client_id}</span>
                    <span className="capitalize text-muted-foreground">{membership.role}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
