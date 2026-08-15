import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  inviteOrganizationMember,
  listOrganizationInvites,
  listOrganizationMembers,
  displayMember,
} from '@/lib/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [inviting, setInviting] = useState(false);

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
      const link = `${window.location.origin}/app/login?invite=${invite.token}`;
      await navigator.clipboard.writeText(link);
      alert(`Invite link copied to clipboard for ${email}`);
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['org-invites'] });
    } catch (err) {
      alert(err.message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Organization</p>
        <h2 className="font-display text-2xl font-bold">Team</h2>
        <p className="text-muted-foreground">Invite editors and admins to your agency workspace</p>
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
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={inviting || !email.trim()}>
              {inviting ? 'Inviting…' : 'Send invite'}
            </Button>
          </form>
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
                    <p className="text-xs text-muted-foreground capitalize">{inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</p>
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
