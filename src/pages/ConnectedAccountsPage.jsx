import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { listSocialAccounts, disconnectSocialAccount, setPrimarySocialAccount } from '@/lib/posts';
import { useClient } from '@/lib/clientContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountPickerModal } from '@/features/settings/AccountPickerModal';

export default function ConnectedAccountsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeClient } = useClient();
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: accounts = [], refetch, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['social-accounts', activeClient?.id],
    queryFn: listSocialAccounts,
  });

  const fbAccounts = accounts.filter((a) => a.platform === 'facebook');
  const igAccounts = accounts.filter((a) => a.platform === 'instagram');

  useEffect(() => {
    if (connected === 'meta') {
      refetch();
    }
  }, [connected, refetch]);

  useEffect(() => {
    if (connected === 'meta' && fbAccounts.length > 1) {
      setPickerOpen(true);
    }
  }, [connected, fbAccounts.length]);

  const clearConnectParams = () => {
    navigate('/app/settings/accounts', { replace: true });
  };

  const connectMeta = async () => {
    if (!activeClient?.id) {
      alert('Select a client before connecting Meta.');
      return;
    }
    try {
      const { url } = await invokeFunction('metaOAuthStart', { clientId: activeClient.id });
      window.location.href = url;
    } catch (err) {
      alert(err.message);
    }
  };

  const disconnect = async (id) => {
    await disconnectSocialAccount(id);
    refetch();
  };

  const setDefault = async (id) => {
    const account = accounts.find((a) => a.id === id);
    await setPrimarySocialAccount(id, {
      linkInstagram: account?.platform === 'facebook',
    });
    refetch();
  };

  const renderAccountRow = (acc, platform) => {
    const label = platform === 'instagram' ? `@${acc.username || acc.name}` : acc.name;
    return (
      <div key={acc.id} className="flex items-center justify-between rounded-md border p-3">
        <div className="flex items-center gap-3">
          {acc.profile_picture_url ? (
            <img src={acc.profile_picture_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : null}
          <PlatformChip platform={platform} />
          <span className="font-medium">{label}</span>
          {acc.is_primary && (
            <Badge variant="published">Default</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!acc.is_primary && (
            <Button variant="outline" size="sm" onClick={() => setDefault(acc.id)}>
              Set as default
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => disconnect(acc.id)}>
            Disconnect
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Settings</p>
        <h2 className="font-display text-2xl font-bold">Connected Accounts</h2>
        <p className="text-muted-foreground">
          Link Meta accounts for {activeClient?.name || 'this client'}
        </p>
      </div>

      {connected === 'meta' && !isLoading && accounts.length > 0 && fbAccounts.length <= 1 && (
        <div className="rounded-hyve-md bg-[#DFF3E6] p-4 text-sm text-status-published">
          You&apos;re connected. Ready to publish.
          <button type="button" className="ml-2 underline" onClick={clearConnectParams}>Dismiss</button>
        </div>
      )}
      {connected === 'meta' && !isLoading && !isError && accounts.length === 0 && (
        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
          Meta authorization succeeded, but no Facebook Pages were imported for {activeClient?.name || 'this client'}.
          Make sure your Meta account manages at least one Page, then try connecting again.
          <button type="button" className="ml-2 underline" onClick={clearConnectParams}>Dismiss</button>
        </div>
      )}
      {isError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Could not load connected accounts: {queryError?.message || 'Unknown error'}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Connection error: {decodeURIComponent(error)}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meta (Facebook & Instagram)</CardTitle>
          <CardDescription>
            Requires a Facebook Page linked to an Instagram Business or Creator account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={connectMeta}>Connect Meta Account</Button>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          ) : (
            <div className="space-y-3">
              {fbAccounts.map((acc) => renderAccountRow(acc, 'facebook'))}
              {igAccounts.map((acc) => renderAccountRow(acc, 'instagram'))}
              {!accounts.length && (
                <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AccountPickerModal
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (!open && connected === 'meta') clearConnectParams();
        }}
        clientName={activeClient?.name}
        fbAccounts={fbAccounts}
        igAccounts={igAccounts}
        onSaved={refetch}
      />
    </div>
  );
}
