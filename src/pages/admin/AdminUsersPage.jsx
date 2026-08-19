import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAdminUsers } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminCreateUserDialog } from '@/features/admin/AdminCreateUserDialog';
import { AdminProvisionResultDialog } from '@/features/admin/AdminProvisionResultDialog';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'team', label: 'Team' },
  { id: 'client_only', label: 'Client only' },
  { id: 'owner', label: 'Owners' },
  { id: 'must_change_password', label: 'Pending password' },
  { id: 'platform_admin', label: 'Platform admins' },
];

const PAGE_SIZE = 50;

function accountBadges(user) {
  const badges = [];
  if (user.must_change_password) badges.push('Pending password');
  if (user.isPlatformAdmin) badges.push('Platform admin');
  if (user.isOwner) badges.push('Owner');
  if (user.isClientOnly) badges.push('Client only');
  return badges;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-users', search, filter, offset],
    queryFn: () => listAdminUsers({ search, filter, limit: PAGE_SIZE, offset }),
  });

  const users = data?.users ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < totalCount;

  const handleSearch = (e) => {
    e.preventDefault();
    setOffset(0);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-4">
      <AdminProvisionResultDialog result={provisionResult} onDismiss={() => setProvisionResult(null)} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input
            placeholder="Search email or name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="outline">Search</Button>
        </form>
        <Button onClick={() => setCreateOpen(true)}>Create user</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ id, label }) => (
          <Button
            key={id}
            size="sm"
            variant={filter === id ? 'default' : 'outline'}
            onClick={() => {
              setFilter(id);
              setOffset(0);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-hyve-lg border border-neutral-200">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="bg-paper-alt text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Organizations</th>
                  <th className="px-4 py-3">Client access</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const badges = accountBadges(user);
                  return (
                    <tr key={user.id} className="border-t border-neutral-100">
                      <td className="px-4 py-3">
                        <div className="font-medium">{user.email}</div>
                        {user.full_name ? (
                          <div className="text-xs text-muted-foreground">{user.full_name}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {badges.length ? badges.map((badge) => (
                            <span
                              key={badge}
                              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                            >
                              {badge}
                            </span>
                          )) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
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
                          <Link to={`/app/admin/users/${user.id}`}>Manage</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!users.length ? (
              <p className="p-4 text-sm text-muted-foreground">No users found.</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {totalCount ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, totalCount)} of ${totalCount}` : '0 users'}
              {isFetching ? ' · Updating…' : ''}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!hasPrev} onClick={() => setOffset((o) => o - PAGE_SIZE)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={!hasNext} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <AdminCreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onProvisioned={setProvisionResult}
      />
    </div>
  );
}
