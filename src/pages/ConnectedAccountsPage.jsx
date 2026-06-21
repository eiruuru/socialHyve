import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { listSocialAccounts, disconnectSocialAccount } from '@/lib/posts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConnectedAccountsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');

  const { data: accounts = [], refetch, isLoading } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: listSocialAccounts,
  });

  const connectMeta = async () => {
    try {
      const { url } = await invokeFunction('metaOAuthStart');
      window.location.href = url;
    } catch (err) {
      alert(err.message);
    }
  };

  const disconnect = async (id) => {
    await disconnectSocialAccount(id);
    refetch();
  };

  const fbAccounts = accounts.filter((a) => a.platform === 'facebook');
  const igAccounts = accounts.filter((a) => a.platform === 'instagram');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Connected Accounts</h2>
        <p className="text-muted-foreground">Link your Facebook Page and Instagram Business account</p>
      </div>

      {connected === 'meta' && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          Meta accounts connected successfully.
          <button className="ml-2 underline" onClick={() => navigate('/app/settings/accounts')}>Dismiss</button>
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
              {fbAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="facebook">Facebook</Badge>
                    <span className="font-medium">{acc.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => disconnect(acc.id)}>Disconnect</Button>
                </div>
              ))}
              {igAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="instagram">Instagram</Badge>
                    <span className="font-medium">@{acc.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => disconnect(acc.id)}>Disconnect</Button>
                </div>
              ))}
              {!accounts.length && (
                <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
