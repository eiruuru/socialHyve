import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listWaitlistRequests, reviewWaitlistRequest } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/lib/toast';

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

export default function AdminWaitlistPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [tempPasswordResult, setTempPasswordResult] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-waitlist', tab],
    queryFn: () => listWaitlistRequests(tab),
  });

  const requests = data?.requests ?? [];

  const handleReview = async (requestId, action) => {
    setBusyId(requestId);
    try {
      const result = await reviewWaitlistRequest({
        requestId,
        action,
        reviewNote: action === 'reject' ? 'Rejected from admin console' : null,
      });
      if (action === 'approve' && result.tempPassword) {
        setTempPasswordResult({
          email: result.email,
          tempPassword: result.tempPassword,
        });
        showToast({
          title: 'Account provisioned',
          description: 'Copy the temporary password — it is shown once.',
          variant: 'success',
        });
      } else {
        showToast({ title: action === 'approve' ? 'Approved' : 'Rejected', variant: 'success' });
      }
      queryClient.invalidateQueries({ queryKey: ['admin-waitlist'] });
    } catch (err) {
      showToast({ title: 'Action failed', description: err.message, variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {tempPasswordResult ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base text-amber-900">Temporary credentials (shown once)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-950">
            <p>Email: <span className="font-mono font-medium">{tempPasswordResult.email}</span></p>
            <p>Password: <span className="font-mono font-medium">{tempPasswordResult.tempPassword}</span></p>
            <p className="text-xs text-amber-800">
              Share securely. The user signs in at /app/login and will be prompted to set a new password.
            </p>
            <Button size="sm" variant="outline" onClick={() => setTempPasswordResult(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label }) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? 'default' : 'outline'}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !requests.length ? (
        <p className="text-sm text-muted-foreground">No {tab} requests.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{row.name || row.email}</p>
                  <p className="text-sm text-muted-foreground">{row.email}</p>
                  {row.message ? (
                    <p className="text-sm text-neutral-700">{row.message}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
                {tab === 'pending' ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() => handleReview(row.id, 'approve')}
                    >
                      {busyId === row.id ? 'Working…' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => handleReview(row.id, 'reject')}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
