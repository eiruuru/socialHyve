import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAdminUsers } from '@/lib/admin';
import { Button } from '@/components/ui/button';

export default function AdminUsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: listAdminUsers,
  });

  const users = data?.users ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-hyve-lg border border-neutral-200">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-paper-alt text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Organizations</th>
                <th className="px-4 py-3">Client access</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-neutral-100">
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.email}</div>
                    {user.full_name ? (
                      <div className="text-xs text-muted-foreground">{user.full_name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[...(user.ownedOrganizations ?? []), ...(user.organizationMemberships ?? [])]
                      .map((entry) => entry.name || entry.organizations?.name)
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(user.clientMemberships ?? [])
                      .map((m) => m.clients?.name)
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/app/admin/users/${user.id}/preview`}>Preview</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length ? (
            <p className="p-4 text-sm text-muted-foreground">No users found.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
