import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { createClient, deleteClient, listClients, updateClient } from '@/lib/organization';
import { useClient } from '@/lib/clientContext';
import { useMembership } from '@/lib/membershipContext';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ClientRow({ client, onUpdated, onDeleted, canManage }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name.trim() === client.name) {
      setEditing(false);
      setName(client.name);
      return;
    }
    setSaving(true);
    try {
      await updateClient(client.id, { name: name.trim() });
      onUpdated();
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = confirm(
      `Delete "${client.name}"?\n\nThis will permanently delete all posts, connections, and members for this client. This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteClient(client.id);
      onDeleted(client.id);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') { setEditing(false); setName(client.name); }
              }}
            />
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(client.name); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <p className="font-medium">{client.name}</p>
            <p className="text-xs text-muted-foreground">{client.slug}</p>
          </>
        )}
      </div>
      {!editing && (
        <div className="flex shrink-0 items-center gap-1">
          {canManage ? (
            <>
              <IconTooltip title="Rename" description="Change this client's display name">
                <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Rename client">
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
    </li>
  );
}

export default function ClientsPage() {
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
      alert(err.message);
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
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Organization</p>
        <h2 className="font-display text-2xl font-bold">Clients</h2>
        <p className="text-muted-foreground">Each client has its own calendar, accounts, and approval workflow</p>
      </div>

      {canManageClients && (
      <Card>
        <CardHeader>
          <CardTitle>New client</CardTitle>
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
