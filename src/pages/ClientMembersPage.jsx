import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { useAuth } from '@/lib/AuthContext';
import { useMembership } from '@/lib/membershipContext';
import {
  addOrInviteClientMember,
  listClientInvites,
  listClientMembers,
  listClientManagers,
  listClients,
  listOrganizationManagers,
  assignManagerToClient,
  removeManagerFromClient,
  removeClientMember,
  revokeClientInvite,
  resendClientInviteReminder,
  buildClientInviteLink,
  displayMember,
  deliverInviteLink,
  updateClientMemberRole,
  canChangeClientMemberRole,
} from '@/lib/organization';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Copy, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { showToast } from '@/lib/toast';
import { CLIENT_ROLE, CLIENT_ROLE_OPTIONS, formatClientRole } from '@/lib/clientRoles';

const memberQueryOptions = {
  refetchOnWindowFocus: true,
  refetchOnMount: 'always',
};

export default function ClientMembersPage() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const { canAssignManagers, orgRole } = useMembership();
  const queryClient = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(CLIENT_ROLE.APPROVER);
  const [inviting, setInviting] = useState(false);
  const [managerUserId, setManagerUserId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState(null);
  const canChangeRoles = canChangeClientMemberRole(orgRole);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: listClients,
  });
  const client = clients.find((c) => c.id === clientId);

  useDocumentMeta({
    title: client?.name ? `${client.name} members` : 'Client members',
    description: PAGE_DESCRIPTIONS.clientMembers,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['client-members', clientId],
    queryFn: () => listClientMembers(clientId),
    enabled: !!clientId,
    ...memberQueryOptions,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['client-invites', clientId],
    queryFn: () => listClientInvites(clientId),
    enabled: !!clientId,
    ...memberQueryOptions,
  });

  const { data: orgManagers = [] } = useQuery({
    queryKey: ['org-managers'],
    queryFn: listOrganizationManagers,
  });

  const { data: clientManagers = [] } = useQuery({
    queryKey: ['client-managers', clientId],
    queryFn: () => listClientManagers(clientId),
    enabled: !!clientId,
  });

  const assignedManagerIds = new Set(clientManagers.map((m) => m.user_id));
  const availableManagers = orgManagers.filter((m) => !assignedManagerIds.has(m.user_id));

  const invalidateMembers = () => {
    queryClient.invalidateQueries({ queryKey: ['client-members', clientId] });
    queryClient.invalidateQueries({ queryKey: ['client-invites', clientId] });
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await addOrInviteClientMember(clientId, normalizedEmail, role);

      if (result.mode === 'added') {
        showToast({
          title: 'Member added',
          description: `${normalizedEmail} can access this client with their existing account.`,
          variant: 'success',
        });
        setEmail('');
        invalidateMembers();
        return;
      }

      const { emailSent } = await deliverInviteLink({
        type: 'client',
        token: result.invite.token,
        email: normalizedEmail,
        inviterName: user?.email,
        targetName: client?.name,
        role: formatClientRole(role),
      });
      showToast({
        title: emailSent ? 'Invite sent' : 'Invite link copied',
        description: emailSent
          ? `Link copied for ${normalizedEmail}. They'll also see an in-app invite if logged in.`
          : `${normalizedEmail} has no account yet — share the copied link (email not configured).`,
        variant: 'success',
      });
      setEmail('');
      invalidateMembers();
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
    try {
      await revokeClientInvite(inviteId);
      invalidateMembers();
      showToast({ title: 'Invite revoked', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Could not revoke invite', description: err.message, variant: 'error' });
    }
  };

  const handleCopyInviteLink = async (invite) => {
    try {
      await navigator.clipboard.writeText(buildClientInviteLink(invite.token));
      showToast({ title: 'Invite link copied', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Could not copy link', description: err.message, variant: 'error' });
    }
  };

  const handleResendInvite = async (invite) => {
    try {
      await resendClientInviteReminder(invite.id);
      const { emailSent } = await deliverInviteLink({
        type: 'client',
        token: invite.token,
        email: invite.email,
        inviterName: user?.email,
        targetName: client?.name,
        role: formatClientRole(invite.role),
      });
      invalidateMembers();
      showToast({
        title: emailSent ? 'Reminder sent' : 'Invite link copied',
        description: emailSent
          ? `If ${invite.email} is logged in, they'll see the invite toast again.`
          : 'Email not configured — link copied to clipboard.',
        variant: 'success',
      });
    } catch (err) {
      showToast({ title: 'Could not resend invite', description: err.message, variant: 'error' });
    }
  };

  const handleRemoveMember = async (member) => {
    const ok = await confirm({
      title: 'Remove member?',
      description: `${displayMember(member)} will lose access to ${client?.name || 'this client'}.`,
      confirmLabel: 'Remove',
      variant: 'destructive',
      onConfirm: async () => true,
    });
    if (!ok) return;
    try {
      await removeClientMember(clientId, member.user_id);
      invalidateMembers();
      showToast({ title: 'Member removed', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Could not remove member', description: err.message, variant: 'error' });
    }
  };

  const handleRoleChange = async (member, nextRole) => {
    if (nextRole === member.role) return;
    setUpdatingRoleUserId(member.user_id);
    try {
      await updateClientMemberRole(clientId, member.user_id, nextRole);
      invalidateMembers();
      showToast({ title: 'Role updated', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Could not update role', description: err.message, variant: 'error' });
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const handleAssignManager = async (e) => {
    e.preventDefault();
    if (!managerUserId) return;
    setAssigning(true);
    try {
      await assignManagerToClient(clientId, managerUserId);
      setManagerUserId('');
      queryClient.invalidateQueries({ queryKey: ['client-managers', clientId] });
    } catch (err) {
      showToast({ title: 'Assign failed', description: err.message, variant: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveManager = async (userId) => {
    try {
      await removeManagerFromClient(clientId, userId);
      queryClient.invalidateQueries({ queryKey: ['client-managers', clientId] });
    } catch (err) {
      showToast({ title: 'Could not remove manager', description: err.message, variant: 'error' });
    }
  };

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      {confirmDialog}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/app/settings/account?tab=clients">← Clients</Link>
        </Button>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Client access</p>
        <h2 className="font-display text-2xl font-bold">{client?.name || 'Client'} members</h2>
        <p className="text-muted-foreground">Add or invite Creatives QA and Guests to review and approve posts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite or add member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Existing socialHyve users are added immediately. New emails receive an invite link by email
            or clipboard. Each client has its own members — open another client&apos;s Members page to
            add the same person with a different role.
          </p>
          <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 sm:flex-none">
              <label className="mb-1 block text-xs font-medium">Email</label>
              <Input
                type="email"
                placeholder="client@brand.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full sm:w-64"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="mb-1 block text-xs font-medium">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-10 w-full rounded-hyve-sm border border-input bg-background px-3 text-sm sm:w-auto"
              >
                {CLIENT_ROLE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={inviting || !email.trim()}>
              {inviting ? 'Adding…' : 'Invite or add'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {canAssignManagers && (
      <Card>
        <CardHeader>
          <CardTitle>Assigned managers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Team managers can work on this client&apos;s calendar, posts, and integrations after you assign them here.
          </p>
          {availableManagers.length > 0 ? (
            <form onSubmit={handleAssignManager} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="w-full sm:w-auto">
                <label className="mb-1 block text-xs font-medium">Manager</label>
                <select
                  value={managerUserId}
                  onChange={(e) => setManagerUserId(e.target.value)}
                  className="h-10 w-full rounded-hyve-sm border border-input bg-background px-3 text-sm sm:min-w-[12rem]"
                >
                  <option value="">Select manager…</option>
                  {availableManagers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {displayMember(m)}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full sm:w-auto" disabled={assigning || !managerUserId}>
                {assigning ? 'Assigning…' : 'Assign manager'}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Invite managers from <strong>Settings → Team</strong>, then assign them to this client.
            </p>
          )}
          {clientManagers.length > 0 ? (
            <ul className="space-y-2">
              {clientManagers.map((m) => (
                <li key={m.id} className="flex flex-col gap-3 rounded-hyve-sm border px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{displayMember(m)}</p>
                    {m.profiles?.email && m.profiles.full_name && (
                      <p className="truncate text-xs text-muted-foreground">{m.profiles.email}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => handleRemoveManager(m.user_id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No managers assigned yet.</p>
          )}
        </CardContent>
      </Card>
      )}

      <div className="grid min-w-0 gap-6 md:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No client members yet. Accepted members appear here — switch back to this tab or refresh
                if you just completed an invite.
              </p>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.id} className="flex flex-col gap-3 rounded-hyve-sm border px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{displayMember(m)}</p>
                      {m.profiles?.email && (
                        <p className="truncate text-xs text-muted-foreground">{m.profiles.email}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {canChangeRoles ? (
                        <select
                          value={m.role}
                          disabled={updatingRoleUserId === m.user_id}
                          onChange={(e) => handleRoleChange(m, e.target.value)}
                          className="h-8 max-w-full rounded-hyve-sm border border-input bg-background px-2 text-sm"
                        >
                          {CLIENT_ROLE_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-muted-foreground">{formatClientRole(m.role)}</span>
                      )}
                      {canChangeRoles && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(m)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invites.</p>
            ) : (
              <ul className="space-y-2">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex flex-col gap-3 rounded-hyve-sm border px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatClientRole(inv.role)} · expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <IconTooltip title="Copy link" description="Copy the invite link to share manually">
                        <Button size="icon" variant="outline" onClick={() => handleCopyInviteLink(inv)} aria-label="Copy link">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </IconTooltip>
                      <IconTooltip title="Resend invite" description="Show the in-app invite again if they are logged in">
                        <Button size="icon" variant="outline" onClick={() => handleResendInvite(inv)} aria-label="Resend invite">
                          <Mail className="h-4 w-4" />
                        </Button>
                      </IconTooltip>
                      <IconTooltip title="Revoke invite" description="Stop this invite from working">
                        <Button size="icon" variant="outline" onClick={() => handleRevokeInvite(inv.id)} aria-label="Revoke invite">
                          <X className="h-4 w-4" />
                        </Button>
                      </IconTooltip>
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
