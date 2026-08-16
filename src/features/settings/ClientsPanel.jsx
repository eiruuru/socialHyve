import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { createClient, deleteClient, listClients, updateClient } from '@/lib/organization';
import { useClient } from '@/lib/clientContext';
import { useMembership } from '@/lib/membershipContext';
import { TimezoneSelect } from '@/components/schedule/TimezoneSelect';
import { formatTimezoneLabel, getBrowserTimezone } from '@/lib/scheduleTime';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/lib/toast';

function ClientRow({ client, onUpdated, onDeleted, canManage }) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client.name);
  const [timezone, setTimezone] = useState(client.default_timezone || getBrowserTimezone());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const nameChanged = name.trim() && name.trim() !== client.name;
    const tzChanged = timezone !== (client.default_timezone || getBrowserTimezone());
    if (!nameChanged && !tzChanged) {
      setEditing(false);
      setName(client.name);
      setTimezone(client.default_timezone || getBrowserTimezone());
      return;
    }
    setSaving(true);
    try {
      await updateClient(client.id, {
        ...(nameChanged ? { name: name.trim() } : {}),
        default_timezone: timezone,
      });
      onUpdated();
      setEditing(false);
    } catch (err) {
      showToast({ title: 'Could not save client', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete "${client.name}"?`,
      description: 'This permanently deletes all posts, connections, and members for this client.',
      confirmLabel: 'Delete client',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteClient(client.id);
      onDeleted(client.id);
      showToast({ title: 'Client deleted', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Could not delete client', description: err.message, variant: 'error' });
    }
  };

  const startEditing = () => {
    setName(client.name);
    setTimezone(client.default_timezone || getBrowserTimezone());
    setEditing(true);
  };

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') {
                    setEditing(false);
                    setName(client.name);
                    setTimezone(client.default_timezone || getBrowserTimezone());
                  }
                }}
              />
              <TimezoneSelect
                value={timezone}
                onChange={setTimezone}
                className="max-w-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setName(client.name);
                  setTimezone(client.default_timezone || getBrowserTimezone());
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="font-medium">{client.name}</p>
            <p className="text-xs text-muted-foreground">{client.slug}</p>
            <p className="text-xs text-muted-foreground">
              Timezone: {formatTimezoneLabel(client.default_timezone || getBrowserTimezone())}
            </p>
          </>
        )}
      </div>
      {!editing && (
        <div className="flex shrink-0 items-center gap-1">
          {canManage ? (
            <>
              <IconTooltip title="Edit client" description="Change name and default timezone">
                <Button variant="ghost" size="icon" onClick={startEditing} aria-label="Edit client">
                  <Pencil className="h-4 w-4" />
                </Button>
              </IconTooltip>
              <IconTooltip title="Delete client" description="Permanently delete this client and all its data">
                <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete client">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </IconTooltip>
            </>
          ) : null}
          <Button variant="outline" size="sm" asChild>
            <Link to={`/app/clients/${client.id}/members`}>Members</Link>
          </Button>
        </div>
      )}
      {confirmDialog}
    </li>
  );
}

export function ClientsPanel() {
  const queryClient = useQueryClient();
  const { refreshClients, setActiveClient } = useClient();
  const { canManageClients } = useMembership();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: listClients,
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const client = await createClient(name.trim());
      setName('');
      await refreshClients();
      setActiveClient(client);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) {
      showToast({ title: 'Could not create client', description: err.message, variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdated = async () => {
    await refreshClients();
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const handleDeleted = async (deletedId) => {
    await refreshClients();
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    const savedId = localStorage.getItem('socialhyve_active_client');
    if (savedId === deletedId) {
      const remaining = clients.filter((c) => c.id !== deletedId);
      if (remaining[0]) setActiveClient(remaining[0]);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Each client has its own calendar, social links, and approval workflow. Switch clients from the sidebar dropdown.
      </p>

      {canManageClients && (
        <Card>
          <CardHeader>
            <CardTitle>New client</CardTitle>
            <CardDescription>Add a brand or account you manage for your organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-2">
              <Input
                placeholder="Client name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" disabled={creating || !name.trim()}>
                {creating ? 'Creating…' : 'Add client'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All clients</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients yet.</p>
          ) : (
            <ul className="divide-y">
              {clients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                  canManage={canManageClients}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
