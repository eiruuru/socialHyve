import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import { createClient, deleteClient, getOrganization, listClients, updateClient } from '@/lib/organization';
import { useClient } from '@/lib/clientContext';
import { useMembership } from '@/lib/membershipContext';
import { TimezoneSelect } from '@/components/schedule/TimezoneSelect';
import { formatTimezoneLabel, getBrowserTimezone } from '@/lib/scheduleTime';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { resolveTierAppPath, useDeviceTier } from '@/lib/deviceTier';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

function ClientCard({
  client,
  isActive,
  onUpdated,
  onDeleted,
  onOpenCalendar,
  canManage,
  canUseClientMembers,
  workspaceTimezone,
}) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client.name);
  const fallbackTimezone = client.default_timezone || workspaceTimezone || getBrowserTimezone();
  const [timezone, setTimezone] = useState(fallbackTimezone);
  const [saving, setSaving] = useState(false);

  const resetEdit = () => {
    setEditing(false);
    setName(client.name);
    setTimezone(client.default_timezone || workspaceTimezone || getBrowserTimezone());
  };

  const handleSave = async () => {
    const nameChanged = name.trim() && name.trim() !== client.name;
    const tzChanged = timezone !== (client.default_timezone || workspaceTimezone || getBrowserTimezone());
    if (!nameChanged && !tzChanged) {
      resetEdit();
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
    setTimezone(client.default_timezone || workspaceTimezone || getBrowserTimezone());
    setEditing(true);
  };

  return (
    <Card className={cn(isActive && 'ring-2 ring-honey/40')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {editing ? (
              <CardTitle className="text-base">Edit client</CardTitle>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{client.name}</CardTitle>
                  {isActive && (
                    <span className="rounded-full bg-honey-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-honey-dark">
                      Active
                    </span>
                  )}
                </div>
                <CardDescription className="mt-0.5">{client.slug}</CardDescription>
              </>
            )}
          </div>
          {!editing && canManage && (
            <div className="flex shrink-0 items-center gap-0.5">
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
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {editing ? (
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') resetEdit();
              }}
            />
            <TimezoneSelect
              value={timezone}
              onChange={setTimezone}
              workspaceDefault={workspaceTimezone}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Timezone: {formatTimezoneLabel(client.default_timezone || workspaceTimezone || getBrowserTimezone())}
          </p>
        )}
      </CardContent>

      {!editing && (
        <div className="flex flex-wrap gap-2 border-t border-neutral-100 px-6 pb-6 pt-4">
          <Button size="sm" className="gap-1.5" onClick={() => onOpenCalendar(client)}>
            <Calendar className="h-4 w-4" />
            Open calendar
          </Button>
          {canUseClientMembers ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/app/clients/${client.id}/members`}>Members</Link>
            </Button>
          ) : null}
        </div>
      )}

      {confirmDialog}
    </Card>
  );
}

export function ClientsPanel() {
  const navigate = useNavigate();
  const tier = useDeviceTier();
  const queryClient = useQueryClient();
  const { refreshClients, setActiveClient, activeClient } = useClient();
  const { canManageClients, canUseClientMembers } = useMembership();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: listClients,
  });

  const { data: org } = useQuery({
    queryKey: ['organization'],
    queryFn: getOrganization,
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

  const handleOpenCalendar = (client) => {
    setActiveClient(client);
    navigate(resolveTierAppPath('/app/calendar', tier));
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

      <div className="space-y-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Your clients</h3>
          {!isLoading && clients.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {clients.length} client{clients.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : clients.length === 0 ? (
          <EmptyHiveState
            title="No clients yet"
            description="Add your first brand to start scheduling content."
            compact
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                isActive={activeClient?.id === client.id}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
                onOpenCalendar={handleOpenCalendar}
                canManage={canManageClients}
                canUseClientMembers={canUseClientMembers}
                workspaceTimezone={org?.default_timezone}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
