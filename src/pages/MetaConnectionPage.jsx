import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { invokeFunction } from '@/lib/supabaseFunctions';
import {
  disconnectMetaSession,
  listWorkspaceMetaPages,
  listWorkspaceMetaSessions,
} from '@/lib/metaAccounts';
import { useMembership } from '@/lib/membershipContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/lib/toast';

function assignedClientName(page) {
  const assignment = (page.client_social_account_assignments || [])[0];
  return assignment?.clients?.name || null;
}

export default function MetaConnectionPage() {
  const { isOwnerOrAdmin } = useMembership();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');
  const [busy, setBusy] = useState(false);

  const { data: sessions = [], refetch: refetchSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['workspace-meta-sessions'],
    queryFn: listWorkspaceMetaSessions,
    enabled: isOwnerOrAdmin,
  });

  const { data: pages = [], refetch: refetchPages, isLoading: pagesLoading } = useQuery({
    queryKey: ['workspace-meta-pages'],
    queryFn: () => listWorkspaceMetaPages(),
    enabled: isOwnerOrAdmin,
  });

  const clearParams = () => navigate('/app/settings/meta', { replace: true });

  const startMetaOAuth = async ({ rerequest = false } = {}) => {
    setBusy(true);
    try {
      const { url } = await invokeFunction('metaOAuthStart', { rerequest });
      window.location.href = url;
    } catch (err) {
      showToast({ title: 'Connection failed', description: err.message, variant: 'error' });
      setBusy(false);
    }
  };

  const disconnectSession = async (session) => {
    if (!await confirm({
      title: `Disconnect ${session.meta_user_name}?`,
      description: 'This removes all pages imported from this Facebook account and unassigns them from every client.',
      confirmLabel: 'Disconnect',
      variant: 'destructive',
    })) return;

    setBusy(true);
    try {
      await disconnectMetaSession(session.id);
      await refetchSessions();
      await refetchPages();
    } catch (err) {
      showToast({ title: 'Could not disconnect', description: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (!isOwnerOrAdmin) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Meta Connection</h2>
        <p className="text-muted-foreground">Only organization owners and admins can manage Meta connections.</p>
      </div>
    );
  }

  const pagesBySession = sessions.map((session) => ({
    session,
    pages: pages.filter((page) => page.meta_session_id === session.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Settings</p>
        <h2 className="font-display text-2xl font-bold">Meta Connection</h2>
        <p className="text-muted-foreground">
          Connect Facebook accounts once at the organization level, then assign pages to each client under Connected Accounts.
        </p>
      </div>

      {connected === 'meta' && (
        <div className="rounded-hyve-md bg-[#DFF3E6] p-4 text-sm text-status-published">
          Meta connected. Assign pages to clients in{' '}
          <Link to="/app/settings/accounts" className="underline">Connected Accounts</Link>.
          <button type="button" className="ml-2 underline" onClick={clearParams}>Dismiss</button>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Connection error: {decodeURIComponent(error)}
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => startMetaOAuth({ rerequest: true })} disabled={busy}>
              Try again
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Facebook accounts</CardTitle>
          <CardDescription>
            Add each Facebook login you use to manage client pages. Reconnecting one account does not affect the others.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => startMetaOAuth()} disabled={busy}>
              Connect Facebook account
            </Button>
            {sessions.length > 0 && (
              <Button variant="outline" onClick={() => startMetaOAuth({ rerequest: true })} disabled={busy}>
                Reconnect latest account
              </Button>
            )}
          </div>

          {sessionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading connected accounts...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Facebook accounts connected yet.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="font-medium">{session.meta_user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Connected {new Date(session.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startMetaOAuth({ rerequest: true })} disabled={busy}>
                      Reconnect
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-700 hover:bg-red-50"
                      onClick={() => disconnectSession(session)}
                      disabled={busy}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imported pages</CardTitle>
          <CardDescription>
            All Facebook Pages and Instagram accounts available to assign to clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pagesLoading ? (
            <p className="text-sm text-muted-foreground">Loading pages...</p>
          ) : pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Connect a Facebook account to import pages.</p>
          ) : (
            <div className="space-y-6">
              {pagesBySession.map(({ session, pages: sessionPages }) => (
                <div key={session.id} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{session.meta_user_name}</p>
                  <div className="space-y-2">
                    {sessionPages.map((page) => {
                      const clientName = assignedClientName(page);
                      const label = page.platform === 'instagram'
                        ? `@${page.username || page.name}`
                        : page.name;
                      return (
                        <div key={page.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                          <div className="flex min-w-0 items-center gap-3">
                            {page.profile_picture_url ? (
                              <img src={page.profile_picture_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : null}
                            <PlatformChip platform={page.platform} />
                            <span className="truncate font-medium">{label}</span>
                          </div>
                          {clientName ? (
                            <Badge variant="secondary">Assigned to {clientName}</Badge>
                          ) : (
                            <Badge variant="outline">Unassigned</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {confirmDialog}
    </div>
  );
}
