import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useMembership } from '@/lib/membershipContext';
import {
  inviteClientMember,
  listClientInvites,
  listClientMembers,
  listClientManagers,
  listClients,
  listOrganizationManagers,
  assignManagerToClient,
  removeManagerFromClient,
  displayMember,
  sendInviteEmail,
} from '@/lib/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/lib/toast';

export default function ClientMembersPage() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const { canAssignManagers } = useMembership();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('approver');
  const [inviting, setInviting] = useState(false);
  const [managerUserId, setManagerUserId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: listClients,
  });
  const client = clients.find((c) => c.id === clientId);

  const { data: members = [] } = useQuery({
    queryKey: ['client-members', clientId],
    queryFn: () => listClientMembers(clientId),
    enabled: !!clientId,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['client-invites', clientId],
    queryFn: () => listClientInvites(clientId),
    enabled: !!clientId,
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

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const invite = await inviteClientMember(clientId, email.trim(), role);
      const link = `${window.location.origin}/app/login?clientInvite=${invite.token}`;
      await navigator.clipboard.writeText(link);
      try {
        await sendInviteEmail({
          type: 'client',
          token: invite.token,
          email: email.trim(),
          inviterName: user?.email,
          targetName: client?.name,
          role,
        });
      } catch {
        // email optional
      }
      showToast({
        title: 'Invite link copied',
        description: `Share the link with ${email}`,
        variant: 'success',
      });
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['client-invites', clientId] });
    } catch (err) {
      showToast({ title: 'Invite failed', description: err.message, variant: 'error' });
    } finally {
      setInviting(false);
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
      showToast({ title: 'Invite failed', description: err.message, variant: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveManager = async (userId) => {
    try {
      await removeManagerFromClient(clientId, userId);
      queryClient.invalidateQueries({ queryKey: ['client-managers', clientId] });
    } catch (err) {
      showToast({ title: 'Invite failed', description: err.message, variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/app/clients">← Clients</Link>
        </Button>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Client access</p>
        <h2 className="font-display text-2xl font-bold">{client?.name || 'Client'} approvers</h2>
        <p className="text-muted-foreground">Invite client stakeholders to review and approve posts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite approver</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Email</label>
              <Input
                type="email"
                placeholder="client@brand.com"
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
                <option value="approver">Approver</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Button type="submit" disabled={inviting || !email.trim()}>
              {inviting ? 'Inviting…' : 'Send invite'}
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
            <form onSubmit={handleAssignManager} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Manager</label>
                <select
                  value={managerUserId}
                  onChange={(e) => setManagerUserId(e.target.value)}
                  className="h-10 rounded-hyve-sm border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select manager…</option>
                  {availableManagers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {displayMember(m)}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={assigning || !managerUserId}>
                {assigning ? 'Assigning…' : 'Assign manager'}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Invite managers from the Team page, then assign them to this client.
            </p>
          )}
          {clientManagers.length > 0 ? (
            <ul className="space-y-2">
              {clientManagers.map((m) => (
                <li key={m.id} className="flex items-center justify-between rounded-hyve-sm border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{displayMember(m)}</p>
                    {m.profiles?.email && m.profiles.full_name && (
                      <p className="text-xs text-muted-foreground">{m.profiles.email}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No client members yet.</p>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-hyve-sm border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{displayMember(m)}</p>
                      {m.profiles?.email && m.profiles.full_name && (
                        <p className="text-xs text-muted-foreground">{m.profiles.email}</p>
                      )}
                    </div>
                    <span className="capitalize text-muted-foreground">{m.role}</span>
                  </li>
                ))}
              </ul>
            )}
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
                  <li key={inv.id} className="rounded-hyve-sm border px-3 py-2 text-sm">
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{inv.role}</p>
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
