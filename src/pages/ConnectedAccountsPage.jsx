import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listSocialAccounts,
  disconnectSocialAccount,
  disconnectAllSocialAccounts,
  setPrimarySocialAccount,
} from '@/lib/posts';
import { useClient } from '@/lib/clientContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountPickerModal } from '@/features/settings/AccountPickerModal';
import { AssignAccountsModal } from '@/features/settings/AssignAccountsModal';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/lib/toast';

export default function ConnectedAccountsPage() {
  const { activeClient } = useClient();
  const queryClient = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: accounts = [], refetch, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['social-accounts', activeClient?.id],
    queryFn: () => listSocialAccounts({ clientId: activeClient.id }),
    enabled: !!activeClient?.id,
  });

  const fbAccounts = accounts.filter((a) => a.platform === 'facebook');
  const igAccounts = accounts.filter((a) => a.platform === 'instagram');
  const hasAccounts = accounts.length > 0;

  const unassign = async (acc) => {
    const label = acc.platform === 'instagram'
      ? `@${acc.username || acc.name}`
      : acc.name;
    if (!await confirm({
      title: `Unassign ${label}?`,
      description: `Remove this page from ${activeClient?.name || 'this client'}. It stays in your organization pool.`,
      confirmLabel: 'Unassign',
      variant: 'destructive',
    })) return;
    setBusy(true);
    try {
      await disconnectSocialAccount(acc.id, { clientId: activeClient.id });
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['workspace-meta-pages'] });
    } catch (err) {
      showToast({ title: 'Could not unassign', description: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const unassignAll = async () => {
    if (!await confirm({
      title: 'Unassign all pages?',
      description: `Remove all assigned pages from ${activeClient?.name || 'this client'}.`,
      confirmLabel: 'Unassign all',
      variant: 'destructive',
    })) return;
    setBusy(true);
    try {
      await disconnectAllSocialAccounts({ clientId: activeClient.id });
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['workspace-meta-pages'] });
    } catch (err) {
      showToast({ title: 'Could not unassign pages', description: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const setDefault = async (id) => {
    const account = accounts.find((a) => a.id === id);
    setBusy(true);
    try {
      await setPrimarySocialAccount(id, {
        clientId: activeClient.id,
        linkInstagram: account?.platform === 'facebook',
      });
      await refetch();
    } catch (err) {
      showToast({ title: 'Could not set default', description: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const renderAccountRow = (acc, platform) => {
    const label = platform === 'instagram' ? `@${acc.username || acc.name}` : acc.name;
    return (
      <div key={acc.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
        <div className="flex min-w-0 items-center gap-3">
          {acc.profile_picture_url ? (
            <img src={acc.profile_picture_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : null}
          <PlatformChip platform={platform} />
          <span className="truncate font-medium">{label}</span>
          {acc.is_primary && <Badge variant="published">Default</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!acc.is_primary && (
            <Button variant="outline" size="sm" onClick={() => setDefault(acc.id)} disabled={busy}>
              Set default
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={() => unassign(acc)}
            disabled={busy}
          >
            Unassign
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Settings</p>
        <h2 className="font-display text-2xl font-bold">Social Links</h2>
        <p className="text-muted-foreground">
          Assign Facebook Pages and Instagram accounts to {activeClient?.name || 'this client'}.
          Connect new pages in{' '}
          <Link to="/app/settings/account?tab=meta" className="underline">Settings → Meta Accounts</Link>.
        </p>
      </div>

      {isError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Could not load connected accounts: {queryError?.message || 'Unknown error'}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Assigned pages</CardTitle>
          <CardDescription>
            Pages assigned here are used when publishing for this client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setAssignOpen(true)} disabled={busy || !activeClient?.id}>
              Assign from pool
            </Button>
            {hasAccounts && (
              <>
                <Button variant="outline" onClick={() => setPickerOpen(true)} disabled={busy}>
                  Choose defaults
                </Button>
                <Button variant="outline" onClick={unassignAll} disabled={busy}>
                  Unassign all
                </Button>
              </>
            )}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          ) : (
            <div className="space-y-3">
              {fbAccounts.map((acc) => renderAccountRow(acc, 'facebook'))}
              {igAccounts.map((acc) => renderAccountRow(acc, 'instagram'))}
              {!accounts.length && (
                <p className="text-sm text-muted-foreground">
                  No pages assigned yet. Assign pages from your organization pool or connect new ones under{' '}
                  <Link to="/app/settings/account?tab=meta" className="underline">Settings → Meta Accounts</Link>.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignAccountsModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        clientId={activeClient?.id}
        clientName={activeClient?.name}
        onAssigned={refetch}
      />

      <AccountPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        clientName={activeClient?.name}
        clientId={activeClient?.id}
        fbAccounts={fbAccounts}
        igAccounts={igAccounts}
        onSaved={refetch}
      />
      {confirmDialog}
    </div>
  );
}
