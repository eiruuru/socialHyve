import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  adminAddClientMember,
  adminRemoveClientMember,
  adminUpdateClientMemberRole,
  getAdminOrganization,
  listAdminOrganizations,
} from '@/lib/admin';
import { CLIENT_ROLE, CLIENT_ROLE_OPTIONS } from '@/lib/clientRoles';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/lib/toast';
import { AdminProvisionResultDialog } from './AdminProvisionResultDialog';

export function AdminClientMembershipsPanel({ user, onUpdated }) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [organizationId, setOrganizationId] = useState('');
  const [clientId, setClientId] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState(CLIENT_ROLE.APPROVER);
  const [adding, setAdding] = useState(false);
  const [updatingKey, setUpdatingKey] = useState(null);
  const [provisionResult, setProvisionResult] = useState(null);

  useEffect(() => {
    if (user?.profile?.email) setEmail(user.profile.email);
  }, [user?.profile?.email]);

  const { data: orgData } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: listAdminOrganizations,
  });

  const { data: orgDetail } = useQuery({
    queryKey: ['admin-organization', organizationId],
    queryFn: () => getAdminOrganization(organizationId),
    enabled: !!organizationId,
  });

  const organizations = orgData?.organizations ?? [];
  const clients = orgDetail?.clients ?? [];
  const memberships = user?.clientMemberships ?? [];

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!clientId || !email.trim()) return;
    setAdding(true);
    try {
      const result = await adminAddClientMember({
        clientId,
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        role,
      });
      if (result.tempPassword) {
        setProvisionResult({
          email: result.email,
          tempPassword: result.tempPassword,
          existingAccount: result.existingAccount,
        });
      }
      showToast({ title: 'Client member added', variant: 'success' });
      setEmail('');
      setFullName('');
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not add client member', description: err.message, variant: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (clientId, userId, newRole) => {
    setUpdatingKey(`${clientId}-${userId}`);
    try {
      await adminUpdateClientMemberRole({ clientId, userId, role: newRole });
      showToast({ title: 'Role updated', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not update role', description: err.message, variant: 'error' });
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleRemove = async (clientId, userId, clientName) => {
    const ok = await confirm({
      title: 'Remove client access?',
      description: `Remove access to ${clientName}?`,
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await adminRemoveClientMember({ clientId, userId });
      showToast({ title: 'Removed from client', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not remove member', description: err.message, variant: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      {confirmDialog}
      <AdminProvisionResultDialog result={provisionResult} onDismiss={() => setProvisionResult(null)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client memberships</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {memberships.length ? (
            <div className="space-y-2 text-sm">
              {memberships.map((membership) => {
                const clientName = membership.clients?.name || membership.client_id;
                const orgName = membership.clients?.organizations?.name;
                const userId = user.profile.id;
                return (
                  <div
                    key={`${membership.client_id}-${membership.role}`}
                    className="flex flex-col gap-2 border-b border-neutral-100 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <span className="font-medium">{clientName}</span>
                      {orgName ? (
                        <p className="text-xs text-muted-foreground">{orgName}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="rounded-hyve-sm border border-neutral-200 bg-white px-2 py-1 text-sm"
                        value={membership.role}
                        disabled={updatingKey === `${membership.client_id}-${userId}`}
                        onChange={(e) => handleRoleChange(membership.client_id, userId, e.target.value)}
                      >
                        {CLIENT_ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleRemove(membership.client_id, userId, clientName)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No client memberships.</p>
          )}

          <form onSubmit={handleAdd} className="space-y-3 border-t border-neutral-100 pt-4">
            <p className="text-sm font-medium">Add to client</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm sm:col-span-2"
                value={organizationId}
                onChange={(e) => {
                  setOrganizationId(e.target.value);
                  setClientId('');
                }}
                required
              >
                <option value="">Select organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
              <select
                className="rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm sm:col-span-2"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                disabled={!organizationId}
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!!user?.profile?.email}
                required
              />
              <Input
                placeholder="Full name (new users)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <select
                className="rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {CLIENT_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <Button type="submit" disabled={adding}>
                {adding ? 'Adding…' : 'Add member'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminClientMembersSection({
  organizationId,
  clients,
  clientMembers,
  onUpdated,
  onProvisioned,
}) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [activeClientId, setActiveClientId] = useState(clients?.[0]?.id || '');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState(CLIENT_ROLE.APPROVER);
  const [adding, setAdding] = useState(false);
  const [updatingKey, setUpdatingKey] = useState(null);

  const membersByClient = useMemo(() => {
    const map = new Map();
    for (const member of clientMembers ?? []) {
      const list = map.get(member.client_id) ?? [];
      list.push(member);
      map.set(member.client_id, list);
    }
    return map;
  }, [clientMembers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!activeClientId || !email.trim()) return;
    setAdding(true);
    try {
      const result = await adminAddClientMember({
        clientId: activeClientId,
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        role,
      });
      if (result.tempPassword) {
        onProvisioned?.({
          email: result.email,
          tempPassword: result.tempPassword,
          existingAccount: result.existingAccount,
        });
      }
      showToast({ title: 'Client member added', variant: 'success' });
      setEmail('');
      setFullName('');
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not add client member', description: err.message, variant: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (clientId, userId, newRole) => {
    setUpdatingKey(`${clientId}-${userId}`);
    try {
      await adminUpdateClientMemberRole({ clientId, userId, role: newRole });
      showToast({ title: 'Role updated', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not update role', description: err.message, variant: 'error' });
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleRemove = async (clientId, userId, clientName, memberEmail) => {
    const ok = await confirm({
      title: 'Remove client access?',
      description: `Remove ${memberEmail} from ${clientName}?`,
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await adminRemoveClientMember({ clientId, userId });
      showToast({ title: 'Removed from client', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not remove member', description: err.message, variant: 'error' });
    }
  };

  if (!clients?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No clients in this organization.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {confirmDialog}
      <CardHeader>
        <CardTitle className="text-base">Client members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          {clients.map((client) => (
            <Button
              key={client.id}
              size="sm"
              variant={activeClientId === client.id ? 'default' : 'outline'}
              onClick={() => setActiveClientId(client.id)}
            >
              {client.name}
            </Button>
          ))}
        </div>

        {activeClientId ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">
                {clients.find((c) => c.id === activeClientId)?.name}
              </p>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/app/admin/organizations/${organizationId}/clients/${activeClientId}/members`}>
                  Full page
                </Link>
              </Button>
            </div>

            <div className="space-y-2">
              {(membersByClient.get(activeClientId) ?? []).map((member) => {
                const profile = member.profiles;
                const userId = member.user_id;
                const memberEmail = profile?.email || userId;
                const clientName = clients.find((c) => c.id === activeClientId)?.name;
                return (
                  <div
                    key={userId}
                    className="flex flex-col gap-2 border-b border-neutral-100 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link to={`/app/admin/users/${userId}`} className="font-medium hover:underline">
                      {memberEmail}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="rounded-hyve-sm border border-neutral-200 bg-white px-2 py-1 text-sm"
                        value={member.role}
                        disabled={updatingKey === `${activeClientId}-${userId}`}
                        onChange={(e) => handleRoleChange(activeClientId, userId, e.target.value)}
                      >
                        {CLIENT_ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleRemove(activeClientId, userId, clientName, memberEmail)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!membersByClient.get(activeClientId)?.length ? (
                <p className="text-muted-foreground">No members for this client.</p>
              ) : null}
            </div>

            <form onSubmit={handleAdd} className="space-y-3 border-t border-neutral-100 pt-4">
              <p className="font-medium">Add client member</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  placeholder="Full name (new users)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <select
                  className="rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {CLIENT_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Button type="submit" disabled={adding}>
                  {adding ? 'Adding…' : 'Add member'}
                </Button>
              </div>
            </form>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminClientMembersCard({
  organizationId,
  client,
  members,
  onUpdated,
  onProvisioned,
}) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState(CLIENT_ROLE.APPROVER);
  const [adding, setAdding] = useState(false);
  const [updatingKey, setUpdatingKey] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      const result = await adminAddClientMember({
        clientId: client.id,
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        role,
      });
      if (result.tempPassword) {
        onProvisioned?.({
          email: result.email,
          tempPassword: result.tempPassword,
          existingAccount: result.existingAccount,
        });
      }
      showToast({ title: 'Client member added', variant: 'success' });
      setEmail('');
      setFullName('');
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not add client member', description: err.message, variant: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingKey(userId);
    try {
      await adminUpdateClientMemberRole({ clientId: client.id, userId, role: newRole });
      showToast({ title: 'Role updated', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not update role', description: err.message, variant: 'error' });
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleRemove = async (userId, memberEmail) => {
    const ok = await confirm({
      title: 'Remove client access?',
      description: `Remove ${memberEmail} from ${client.name}?`,
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await adminRemoveClientMember({ clientId: client.id, userId });
      showToast({ title: 'Removed from client', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not remove member', description: err.message, variant: 'error' });
    }
  };

  return (
    <Card>
      {confirmDialog}
      <CardHeader>
        <CardTitle className="text-base">{client.name} members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {(members ?? []).map((member) => {
          const profile = member.profiles;
          const userId = member.user_id;
          const memberEmail = profile?.email || userId;
          return (
            <div
              key={userId}
              className="flex flex-col gap-2 border-b border-neutral-100 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link to={`/app/admin/users/${userId}`} className="font-medium hover:underline">
                {memberEmail}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-hyve-sm border border-neutral-200 bg-white px-2 py-1 text-sm"
                  value={member.role}
                  disabled={updatingKey === userId}
                  onChange={(e) => handleRoleChange(userId, e.target.value)}
                >
                  {CLIENT_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleRemove(userId, memberEmail)}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
        {!members?.length ? <p className="text-muted-foreground">No members.</p> : null}

        <form onSubmit={handleAdd} className="space-y-3 border-t border-neutral-100 pt-4">
          <p className="font-medium">Add member</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              placeholder="Full name (new users)"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <select
              className="rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {CLIENT_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button type="submit" disabled={adding}>
              {adding ? 'Adding…' : 'Add member'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
