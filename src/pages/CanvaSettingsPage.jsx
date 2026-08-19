import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { getCanvaConnection, disconnectCanva } from '@/lib/posts';
import { UpgradeToProBanner } from '@/components/billing/UpgradeToProBanner';
import { getActiveClientId, useClient } from '@/lib/clientContext';
import { useMembership } from '@/lib/membershipContext';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CanvaSettingsPage() {
  useDocumentMeta({ title: 'Canva integration', description: PAGE_DESCRIPTIONS.canva });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeClient } = useClient();
  const { canUseCanva } = useMembership();
  const clientId = activeClient?.id || getActiveClientId();
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');

  const { data: connection, refetch, isLoading, isFetching } = useQuery({
    queryKey: ['canva-connection', clientId],
    queryFn: getCanvaConnection,
    enabled: !!clientId,
  });

  useEffect(() => {
    if (connected !== 'canva') return;
    queryClient.invalidateQueries({ queryKey: ['canva-connection'] });
    refetch();
  }, [connected, queryClient, refetch]);

  const dismissBanner = () => {
    navigate('/app/settings/canva', { replace: true });
  };

  const connectCanva = async () => {
    if (!clientId) {
      showToast({ title: 'Select a client first', variant: 'error' });
      return;
    }
    try {
      const { url } = await invokeFunction('canvaOAuthStart', { clientId });
      window.location.href = url;
    } catch (err) {
      showToast({ title: 'Could not connect Canva', description: err.message, variant: 'error' });
    }
  };

  const disconnect = async () => {
    await disconnectCanva();
    await queryClient.invalidateQueries({ queryKey: ['canva-connection'] });
    refetch();
  };

  const showConnected = !!connection;
  const showSuccessBanner = connected === 'canva' && showConnected;

  if (!canUseCanva) {
    return (
      <div className="space-y-6">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Settings</p>
          <h2 className="font-display text-2xl font-bold">Canva Integration</h2>
          <p className="text-muted-foreground">Import designs from Canva into your posts</p>
        </div>
        <UpgradeToProBanner feature="Canva import" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Settings</p>
        <h2 className="font-display text-2xl font-bold">Canva Integration</h2>
        <p className="text-muted-foreground">Connect Canva for {activeClient?.name || 'this client'}</p>
      </div>

      {showSuccessBanner && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          Canva connected successfully.
          <button type="button" className="ml-2 underline" onClick={dismissBanner}>Dismiss</button>
        </div>
      )}
      {connected === 'canva' && !isLoading && !isFetching && !showConnected && (
        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
          Authorization completed but no connection was saved. Try connecting again, or check that a client is selected.
          <button type="button" className="ml-2 underline" onClick={dismissBanner}>Dismiss</button>
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Connection error: {decodeURIComponent(error)}
          <button type="button" className="ml-2 underline" onClick={dismissBanner}>Dismiss</button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Canva Connect</CardTitle>
          <CardDescription>
            Browse your Canva designs and export them as post attachments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!clientId ? (
            <p className="text-sm text-muted-foreground">Select a client in the sidebar to connect Canva.</p>
          ) : isLoading || isFetching ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : showConnected ? (
            <div className="space-y-3">
              <p className="text-sm text-green-700">Canva is connected</p>
              <p className="text-xs text-muted-foreground">
                Token expires: {new Date(connection.token_expires_at).toLocaleString()}
              </p>
              <Button variant="outline" onClick={disconnect}>Disconnect Canva</Button>
            </div>
          ) : (
            <Button onClick={connectCanva}>Connect Canva</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
