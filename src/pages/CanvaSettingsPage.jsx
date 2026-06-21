import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { getCanvaConnection, disconnectCanva } from '@/lib/posts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CanvaSettingsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');

  const { data: connection, refetch, isLoading } = useQuery({
    queryKey: ['canva-connection'],
    queryFn: getCanvaConnection,
  });

  const connectCanva = async () => {
    try {
      const { url } = await invokeFunction('canvaOAuthStart');
      window.location.href = url;
    } catch (err) {
      alert(err.message);
    }
  };

  const disconnect = async () => {
    await disconnectCanva();
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Canva Integration</h2>
        <p className="text-muted-foreground">Connect Canva to attach designs to your posts</p>
      </div>

      {connected === 'canva' && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          Canva connected successfully.
          <button className="ml-2 underline" onClick={() => navigate('/app/settings/canva')}>Dismiss</button>
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Connection error: {decodeURIComponent(error)}
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
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : connection ? (
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
