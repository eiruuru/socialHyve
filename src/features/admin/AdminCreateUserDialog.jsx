import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAdminOrganization, listAdminOrganizations, provisionAdminUser } from '@/lib/admin';
import { ORG_ROLE_OPTIONS } from '@/lib/organization';
import { CLIENT_ROLE, CLIENT_ROLE_OPTIONS } from '@/lib/clientRoles';
import { showToast } from '@/lib/toast';

export function AdminCreateUserDialog({ open, onOpenChange, onProvisioned }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [assignOrg, setAssignOrg] = useState('');
  const [orgRole, setOrgRole] = useState('editor');
  const [assignClient, setAssignClient] = useState('');
  const [clientRole, setClientRole] = useState(CLIENT_ROLE.APPROVER);
  const [busy, setBusy] = useState(false);

  const { data: orgListData } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: listAdminOrganizations,
    enabled: open,
  });

  const { data: orgDetailData } = useQuery({
    queryKey: ['admin-organization', assignOrg],
    queryFn: () => getAdminOrganization(assignOrg),
    enabled: open && !!assignOrg,
  });

  const organizations = orgListData?.organizations ?? [];
  const clients = orgDetailData?.clients ?? [];

  const reset = () => {
    setEmail('');
    setFullName('');
    setAssignOrg('');
    setOrgRole('editor');
    setAssignClient('');
    setClientRole(CLIENT_ROLE.APPROVER);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const assignments = [];
      if (assignOrg) {
        assignments.push({ type: 'organization', organizationId: assignOrg, role: orgRole });
      }
      if (assignClient) {
        assignments.push({ type: 'client', clientId: assignClient, role: clientRole });
      }
      const result = await provisionAdminUser({
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        assignments,
      });
      showToast({
        title: 'User provisioned',
        description: 'Copy the temporary password — it is shown once.',
        variant: 'success',
      });
      onProvisioned?.({
        email: result.email,
        tempPassword: result.tempPassword,
        existingAccount: result.existingAccount,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      showToast({ title: 'Could not create user', description: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>
              Provisions a new account with a temporary password. Optionally assign to an organization or client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Full name</span>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Organization (optional)</span>
              <select
                className="w-full rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm"
                value={assignOrg}
                onChange={(e) => {
                  setAssignOrg(e.target.value);
                  setAssignClient('');
                }}
              >
                <option value="">None</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </label>
            {assignOrg ? (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Org role</span>
                <select
                  className="w-full rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm"
                  value={orgRole}
                  onChange={(e) => setOrgRole(e.target.value)}
                >
                  {ORG_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {assignOrg && clients.length ? (
              <>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Client (optional)</span>
                  <select
                    className="w-full rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm"
                    value={assignClient}
                    onChange={(e) => setAssignClient(e.target.value)}
                  >
                    <option value="">None</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </label>
                {assignClient ? (
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">Client role</span>
                    <select
                      className="w-full rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm"
                      value={clientRole}
                      onChange={(e) => setClientRole(e.target.value)}
                    >
                      {CLIENT_ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
