import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useMembership } from '@/lib/membershipContext';
import {
  inviteOrganizationMember,
  listOrganizationInvites,
  listOrganizationMembers,
  displayMember,
  sendInviteEmail,
  getOrganization,
  updateOrganizationSettings,
  revokeOrganizationInvite,
  removeOrganizationMember,
  buildOrganizationInviteLink,
} from '@/lib/organization';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeamPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageTeam, loading: membershipLoading } = useMembership();
  const queryClient = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const { data: org, refetch: refetchOrg } = useQuery({
    queryKey: ['organization'],
    queryFn: getOrganization,
  });

  useEffect(() => {
    if (membershipLoading) return;
    if (!canManageTeam) navigate('/app/calendar', { replace: true });
  }, [canManageTeam, membershipLoading, navigate]);

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: listOrganizationMembers,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['org-invites'],
    queryFn: listOrganizationInvites,
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const invite = await inviteOrganizationMember(email.trim(), role);
      const org = await getOrganization();
      const link = buildOrganizationInviteLink(invite.token);
      await navigator.clipboard.writeText(link);
      try {
        await sendInviteEmail({
          type: 'organization',
          token: invite.token,
          email: email.trim(),
          inviterName: user?.email,
          targetName: org?.name,
          role,
        });
      } catch {
        // email optional
      }
      showToast({ title: 'Invite link copied', description: email.trim(), variant: 'success' });
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['org-invites'] });
    } catch (err) {
      showToast({ title: 'Invite failed', description: err.message, variant: 'error' });
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    const ok = await confirm({
      title: 'Revoke invite?',
      description: 'The invite link will stop working.',
      confirmLabel: 'Revoke',
      variant: 'destructive',
      onConfirm: async () => true,
    });
    if (!ok) return;
    await revokeOrganizationInvite(inviteId);
    queryClient.invalidateQueries({ queryKey: ['org-invites'] });
    showToast({ title: 'Invite revoked', variant: 'success' });
  };

  const handleCopyInviteLink = async (invite) => {
    try {
      await navigator.clipboard.writeText(buildOrganizationInviteLink(invite.token));
      showToast({ title: 'Invite link copied', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Could not copy link', description: err.message, variant: 'error' });
    }
  };

  const handleResendInviteEmail = async (invite) => {
    try {
      const orgData = org || (await getOrganization());
      await sendInviteEmail({
        type: 'organization',
        token: invite.token,
        email: invite.email,
        inviterName: user?.email,
        targetName: orgData?.name,
        role: invite.role,
      });
      showToast({ title: 'Invite email sent again', variant: 'success' });
    } catch {
      try {
        await navigator.clipboard.writeText(buildOrganizationInviteLink(invite.token));
        showToast({
          title: 'Email not configured — link copied',
          description: 'Share the link manually with your teammate.',
          variant: 'info',
        });
      } catch (err) {
        showToast({ title: 'Could not resend invite', description: err.message, variant: 'error' });
      }
    }
  };

  const handleToggleApproval = async (checked) => {
    setSavingSettings(true);
    try {
      await updateOrganizationSettings({ require_approval_before_publish: checked });
      await refetchOrg();
      showToast({
        title: checked ? 'Approval required before publish' : 'Approval gate disabled',
        variant: 'success',
      });
    } catch (err) {
      showToast({ title: 'Could not save setting', description: err.message, variant: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const ok = await confirm({
      title: 'Remove team member?',
      description: `${displayMember(member)} will lose access to this organization.`,
      confirmLabel: 'Remove',
      variant: 'destructive',
      onConfirm: async () => true,
    });
    if (!ok) return;
    await removeOrganizationMember(member.user_id);
    queryClient.invalidateQueries({ queryKey: ['org-members'] });
    showToast({ title: 'Member removed', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Organization</p>
        <h2 className="font-display text-2xl font-bold">Team</h2>
        <p className="text-muted-foreground">
          Invite editors, managers, and admins. Managers get client access once assigned on a client&apos;s members page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite team member</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Email</label>
              <Input
                type="email"
                placeholder="colleague@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-64"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-10 rounded-hyve-sm border border-input bg-background px-3 text-sm"
              >
                <option value="editor">Editor</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={inviting || !email.trim()}>
              {inviting ? 'Inviting…' : 'Send invite'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publishing workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 accent-honey-dark"
              checked={org?.require_approval_before_publish !== false}
              disabled={savingSettings}
              onChange={(e) => handleToggleApproval(e.target.checked)}
            />
            <span>
              <span className="font-medium">Require approval before schedule or publish</span>
              <span className="mt-1 block text-muted-foreground">
                When enabled, posts must be approved before scheduling or publishing. Admins can still override on post detail.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 rounded-hyve-sm border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{displayMember(m)}</p>
                    {m.profiles?.email && m.profiles.full_name && (
                      <p className="text-xs text-muted-foreground">{m.profiles.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="capitalize text-muted-foreground">{m.role}</span>
                    {m.user_id !== user?.id && m.role !== 'owner' && (
                      <Button size="sm" variant="outline" onClick={() => handleRemoveMember(m)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invites.</p>
            ) : (
              <ul className="space-y-2">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex flex-col gap-2 rounded-hyve-sm border px-3 py-2 text-sm sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleCopyInviteLink(inv)}>
                        Copy link
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleResendInviteEmail(inv)}>
                        Resend email
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRevokeInvite(inv.id)}>
                        Revoke
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
