import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminOrganization } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { AdminClientMembersCard } from '@/features/admin/AdminClientMembershipsPanel';
import { AdminProvisionResultDialog } from '@/features/admin/AdminProvisionResultDialog';

export default function AdminClientMembersPage() {
  const { orgId, clientId } = useParams();
  const queryClient = useQueryClient();
  const [provisionResult, setProvisionResult] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-organization', orgId],
    queryFn: () => getAdminOrganization(orgId),
    enabled: !!orgId,
  });

  const org = data?.organization;
  const client = data?.clients?.find((c) => c.id === clientId);
  const members = (data?.clientMembers ?? []).filter((m) => m.client_id === clientId);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-organization', orgId] });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={`/app/admin/organizations/${orgId}`}>← {org?.name || 'Organization'}</Link>
      </Button>

      <AdminProvisionResultDialog result={provisionResult} onDismiss={() => setProvisionResult(null)} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !client ? (
        <p className="text-sm text-muted-foreground">Client not found.</p>
      ) : (
        <AdminClientMembersCard
          organizationId={orgId}
          client={client}
          members={members}
          onUpdated={refresh}
          onProvisioned={setProvisionResult}
        />
      )}
    </div>
  );
}
