import { useEffect, useState } from 'react';
import {
  resetAdminUserPassword,
  setAdminUserMustChangePassword,
  updateAdminUserProfile,
} from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/lib/toast';
import { AdminProvisionResultDialog } from './AdminProvisionResultDialog';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function AdminAccountPanel({ user, onUpdated }) {
  const [fullName, setFullName] = useState(user?.profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [togglingFlag, setTogglingFlag] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);

  useEffect(() => {
    setFullName(user?.profile?.full_name || '');
  }, [user?.profile?.full_name, user?.profile?.id]);

  if (!user?.profile) return null;

  const { profile, isPlatformAdmin, auth } = user;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAdminUserProfile({ userId: profile.id, fullName: fullName.trim() || null });
      showToast({ title: 'Profile updated', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not update profile', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    try {
      const result = await resetAdminUserPassword(profile.id);
      setProvisionResult({
        email: result.email,
        tempPassword: result.tempPassword,
        existingAccount: true,
      });
      showToast({ title: 'Password reset', description: 'Copy the temporary password.', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not reset password', description: err.message, variant: 'error' });
    } finally {
      setResetting(false);
    }
  };

  const handleToggleMustChange = async () => {
    setTogglingFlag(true);
    try {
      await setAdminUserMustChangePassword(profile.id, !profile.must_change_password);
      showToast({ title: 'Updated password requirement', variant: 'success' });
      onUpdated?.();
    } catch (err) {
      showToast({ title: 'Could not update flag', description: err.message, variant: 'error' });
    } finally {
      setTogglingFlag(false);
    }
  };

  return (
    <div className="space-y-4">
      <AdminProvisionResultDialog result={provisionResult} onDismiss={() => setProvisionResult(null)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {profile.must_change_password ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Must change password</span>
            ) : null}
            {isPlatformAdmin ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-900">Platform admin</span>
            ) : null}
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 space-y-1 text-sm">
              <span className="font-medium">Display name</span>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save name'}
            </Button>
          </form>

          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <p>Created: {formatDate(auth?.createdAt)}</p>
            <p>Last sign-in: {formatDate(auth?.lastSignInAt)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleResetPassword} disabled={resetting}>
              {resetting ? 'Resetting…' : 'Reset password'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleToggleMustChange} disabled={togglingFlag}>
              {profile.must_change_password ? 'Clear password change requirement' : 'Require password change'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
