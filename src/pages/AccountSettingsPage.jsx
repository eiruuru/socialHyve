import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { getProfile, updateEmail, updateNotificationPreferences, updatePassword, updateProfile } from '@/lib/profile';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function Field({ label, htmlFor, children, hint }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatusBanner({ message, tone = 'success' }) {
  if (!message) return null;
  const classes = tone === 'success'
    ? 'bg-[#DFF3E6] text-status-published'
    : 'bg-[#FCE4E3] text-[#A62E2B]';
  return (
    <div className={`rounded-hyve-sm px-3 py-2 text-sm ${classes}`}>
      {message}
    </div>
  );
}

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: getProfile,
    enabled: !!user?.id,
  });

  const [fullName, setFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameStatus, setNameStatus] = useState({ message: '', tone: 'success' });
  const [emailStatus, setEmailStatus] = useState({ message: '', tone: 'success' });
  const [passwordStatus, setPasswordStatus] = useState({ message: '', tone: 'success' });

  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    submitted_for_review: true,
    approved: true,
    changes_requested: true,
    publish_failed: true,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  useEffect(() => {
    if (user?.email) setNewEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (!profile) return;
    setEmailNotificationsEnabled(!!profile.email_notifications_enabled);
    if (profile.notification_preferences) {
      setNotificationPrefs((current) => ({ ...current, ...profile.notification_preferences }));
    }
  }, [profile]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    setNameStatus({ message: '', tone: 'success' });
    setSavingName(true);
    try {
      await updateProfile({ fullName });
      await queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['org-members'] });
      setNameStatus({ message: 'Name updated.', tone: 'success' });
      showToast({ title: 'Name updated', variant: 'success' });
    } catch (err) {
      setNameStatus({ message: err.message, tone: 'error' });
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setEmailStatus({ message: '', tone: 'success' });
    if (newEmail.trim() === user?.email) {
      setEmailStatus({ message: 'That is already your email address.', tone: 'error' });
      return;
    }
    setSavingEmail(true);
    try {
      await updateEmail(newEmail);
      setEmailStatus({
        message: 'Check your inbox to confirm the new email address.',
        tone: 'success',
      });
    } catch (err) {
      setEmailStatus({ message: err.message, tone: 'error' });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus({ message: '', tone: 'success' });
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ message: 'New passwords do not match.', tone: 'error' });
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus({ message: 'Password updated.', tone: 'success' });
    } catch (err) {
      setPasswordStatus({ message: err.message, tone: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    setSavingNotifications(true);
    try {
      await updateNotificationPreferences({
        emailNotificationsEnabled,
        notificationPreferences: notificationPrefs,
      });
      await queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      showToast({ title: 'Notification preferences saved', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Could not save preferences', description: err.message, variant: 'error' });
    } finally {
      setSavingNotifications(false);
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading account…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Settings</p>
        <h2 className="font-display text-2xl font-bold">Account</h2>
        <p className="text-muted-foreground">Update your name, email, and password</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How your name appears to teammates and on assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-4">
            <Field label="Full name" htmlFor="full-name">
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </Field>
            <StatusBanner message={nameStatus.message} tone={nameStatus.tone} />
            <Button type="submit" disabled={savingName}>
              {savingName ? 'Saving…' : 'Save name'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Changing your email sends a confirmation link to the new address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveEmail} className="space-y-4">
            <Field
              label="Email address"
              htmlFor="email"
              hint={`Current: ${user?.email || '—'}`}
            >
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </Field>
            <StatusBanner message={emailStatus.message} tone={emailStatus.tone} />
            <Button type="submit" disabled={savingEmail}>
              {savingEmail ? 'Saving…' : 'Update email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Use a strong password you don&apos;t use elsewhere</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePassword} className="space-y-4">
            <Field label="Current password" htmlFor="current-password">
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="New password" htmlFor="new-password">
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm-password">
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </Field>
            <StatusBanner message={passwordStatus.message} tone={passwordStatus.tone} />
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? 'Saving…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            In-app toasts always appear. Email is optional and off by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveNotifications} className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={emailNotificationsEnabled}
                onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
              />
              Email me about posts I care about
            </label>
            {emailNotificationsEnabled && (
              <div className="space-y-2 pl-6 text-sm">
                {[
                  ['submitted_for_review', 'Submitted for review'],
                  ['approved', 'Approved'],
                  ['changes_requested', 'Changes requested'],
                  ['publish_failed', 'Publish failed'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationPrefs[key] !== false}
                      onChange={(e) => setNotificationPrefs((current) => ({
                        ...current,
                        [key]: e.target.checked,
                      }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
            <Button type="submit" disabled={savingNotifications}>
              {savingNotifications ? 'Saving…' : 'Save notification preferences'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
