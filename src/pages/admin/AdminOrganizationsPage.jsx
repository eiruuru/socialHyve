import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAdminOrganizations } from '@/lib/admin';
import { getPlanLabel } from '@/lib/plans';
import { Button } from '@/components/ui/button';

export default function AdminOrganizationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: listAdminOrganizations,
  });

  const organizations = data?.organizations ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-hyve-lg border border-neutral-200">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-paper-alt text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-t border-neutral-100">
                  <td className="px-4 py-3 font-medium">{org.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{org.owner?.email || '—'}</td>
                  <td className="px-4 py-3">{getPlanLabel(org.plan)}</td>
                  <td className="px-4 py-3 capitalize">{org.subscription_status?.replace('_', ' ') || 'none'}</td>
                  <td className="px-4 py-3">{org.memberCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/app/admin/organizations/${org.id}`}>Manage</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!organizations.length ? (
            <p className="p-4 text-sm text-muted-foreground">No organizations found.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
