import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  adminAddOrgMember,
  adminRemoveOrgMember,
  adminUpdateOrgMemberRole,
  listAdminOrganizations,
} from '@/lib/admin';
import { ORG_ROLE_OPTIONS } from '@/lib/organization';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/lib/toast';
import { AdminProvisionResultDialog } from './AdminProvisionResultDialog';

export function AdminOrgMembershipsPanel({ user, onUpdated }) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [role, setRole] = useState('editor');
  const [adding, setAdding] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [provisionResult, setProvisionResult] = useState(null);

  useEffect(() => {
    if (user?.profile?.email) setEmail(user.profile.email);
  }, [user?.profile?.email]);

  const { data: orgData } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: listAdminOrganizations,
  });

  const organizations = orgData?.organizations ?? [];
  const memberships = [
    ...(user?.ownedOrganizations ?? []).map((org) => ({
      organization_id: org.id,
      role: 'owner',
      organizations: org,
      user_id: user.profile.id,
      isOwnerRecord: true,
    })),
    ...(user?.organizationMemberships ?? []).filter(
      (m) => !(user?.ownedOrganizations ?? []).some((o) => o.id === m.organization_id && m.role === 'owner'),
    ),
  ];

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!organizationId || !email.trim()) return;
    setAdding(true);
    try {
      const result = await adminAddOrgMember({
        organizationId,
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
      showToast({ title: 'Team member added', variant: 'success' });
      setEmail('');
      setFullName('');
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not add member', description: err.message, variant: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (organizationId, userId, newRole, orgName) => {
    if (newRole === 'owner') {
      const ok = await confirm({
        title: 'Transfer ownership?',
        description: `Assign ${orgName} ownership to this user. The prior owner will be demoted to admin.`,
        confirmLabel: 'Transfer ownership',
      });
      if (!ok) return;
    }
    setUpdatingUserId(userId);
    try {
      await adminUpdateOrgMemberRole({ organizationId, userId, role: newRole });
      showToast({ title: 'Role updated', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not update role', description: err.message, variant: 'error' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRemove = async (organizationId, userId, orgName) => {
    const ok = await confirm({
      title: 'Remove from organization?',
      description: `Remove this user from ${orgName}? Their account will not be deleted.`,
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await adminRemoveOrgMember({ organizationId, userId });
      showToast({ title: 'Removed from organization', variant: 'success' });
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
          <CardTitle className="text-base">Team memberships</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {memberships.length ? (
            <div className="space-y-2 text-sm">
              {memberships.map((membership) => {
                const orgId = membership.organization_id;
                const orgName = membership.organizations?.name || orgId;
                const userId = membership.user_id || user.profile.id;
                return (
                  <div
                    key={`${orgId}-${userId}`}
                    className="flex flex-col gap-2 border-b border-neutral-100 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        to={`/app/admin/organizations/${orgId}`}
                        className="font-medium hover:underline"
                      >
                        {orgName}
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="rounded-hyve-sm border border-neutral-200 bg-white px-2 py-1 text-sm capitalize"
                        value={membership.role}
                        disabled={updatingUserId === userId}
                        onChange={(e) => handleRoleChange(orgId, userId, e.target.value, orgName)}
                      >
                        {ORG_ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleRemove(orgId, userId, orgName)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No team memberships.</p>
          )}

          <form onSubmit={handleAdd} className="space-y-3 border-t border-neutral-100 pt-4">
            <p className="text-sm font-medium">Add to organization</p>
            <div className="grid gap-3 sm:grid-cols-2">
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
                className="rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm sm:col-span-2"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                required
              >
                <option value="">Select organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
              <select
                className="rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ORG_ROLE_OPTIONS.map((opt) => (
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

export function AdminTeamMembersCard({
  organizationId,
  members,
  owner,
  onUpdated,
  onProvisioned,
}) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('editor');
  const [adding, setAdding] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const allMembers = members ?? [];
  const ownerInList = owner && !allMembers.some((m) => m.user_id === owner.id);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      const result = await adminAddOrgMember({
        organizationId,
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
      showToast({ title: 'Team member added', variant: 'success' });
      setEmail('');
      setFullName('');
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not add member', description: err.message, variant: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (userId, newRole, memberEmail) => {
    if (newRole === 'owner') {
      const ok = await confirm({
        title: 'Transfer ownership?',
        description: `Assign workspace ownership to ${memberEmail}. The prior owner will be demoted to admin.`,
        confirmLabel: 'Transfer ownership',
      });
      if (!ok) return;
    }
    setUpdatingUserId(userId);
    try {
      await adminUpdateOrgMemberRole({ organizationId, userId, role: newRole });
      showToast({ title: 'Role updated', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not update role', description: err.message, variant: 'error' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRemove = async (userId, memberEmail) => {
    const ok = await confirm({
      title: 'Remove from team?',
      description: `Remove ${memberEmail} from this organization?`,
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await adminRemoveOrgMember({ organizationId, userId });
      showToast({ title: 'Removed from team', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not remove member', description: err.message, variant: 'error' });
    }
  };

  const renderRow = (member) => {
    const profile = member.profiles;
    const userId = member.user_id;
    const memberEmail = profile?.email || userId;
    return (
      <div
        key={userId}
        className="flex flex-col gap-2 border-b border-neutral-100 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <Link to={`/app/admin/users/${userId}`} className="font-medium hover:underline">
            {memberEmail}
          </Link>
          {profile?.full_name ? (
            <p className="text-xs text-muted-foreground">{profile.full_name}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-hyve-sm border border-neutral-200 bg-white px-2 py-1 text-sm"
            value={member.role}
            disabled={updatingUserId === userId}
            onChange={(e) => handleRoleChange(userId, e.target.value, memberEmail)}
          >
            {ORG_ROLE_OPTIONS.map((opt) => (
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
  };

  return (
    <Card>
      {confirmDialog}
      <CardHeader>
        <CardTitle className="text-base">Team members ({allMembers.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {ownerInList ? renderRow({ user_id: owner.id, role: 'owner', profiles: owner }) : null}
        {allMembers.map(renderRow)}
        {!allMembers.length && !ownerInList ? (
          <p className="text-muted-foreground">No team members.</p>
        ) : null}

        <form onSubmit={handleAdd} className="space-y-3 border-t border-neutral-100 pt-4">
          <p className="font-medium">Add team member</p>
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
              {ORG_ROLE_OPTIONS.map((opt) => (
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
