import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useMembership } from '@/lib/membershipContext';
import { getProfile, updateEmail, updateInAppNotificationPreferences, updateNotificationPreferences, updatePassword, updateProfile } from '@/lib/profile';
import { DEFAULT_IN_APP_PREFS, IN_APP_PREF_LABELS } from '@/lib/notifications/notificationTypes';
import { isPushSupported, requestPushPermission, unsubscribeFromPush } from '@/lib/pushNotifications';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MetaConnectionPanel } from '@/features/settings/MetaConnectionPanel';
import { ClientsPanel } from '@/features/settings/ClientsPanel';
import { TeamPanel } from '@/features/settings/TeamPanel';
import { WorkspacePanel } from '@/features/settings/WorkspacePanel';

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
  const { isOwnerOrAdmin, isOrgTeam, isClientOnly, canManageTeam } = useMembership();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const showWorkspaceTab = canManageTeam;
  const showClientsTab = isOrgTeam && !isClientOnly;
  const showTeamTab = canManageTeam;
  const showMetaTab = isOwnerOrAdmin;

  const activeTab = (() => {
    const tab = searchParams.get('tab');
    if (tab === 'workspace' && showWorkspaceTab) return 'workspace';
    if (
      (tab === 'meta' || searchParams.get('connected') === 'meta' || searchParams.get('error'))
      && showMetaTab
    ) {
      return 'meta';
    }
    if (tab === 'clients' && showClientsTab) return 'clients';
    if (tab === 'team' && showTeamTab) return 'team';
    return 'profile';
  })();

  const setActiveTab = (tab) => {
    if (tab === 'profile') {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ tab }, { replace: true });
  };

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
  const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState(true);
  const [inAppPrefs, setInAppPrefs] = useState({ ...DEFAULT_IN_APP_PREFS });
  const [savingInAppNotifications, setSavingInAppNotifications] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

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
    setInAppNotificationsEnabled(profile.in_app_notifications_enabled !== false);
    if (profile.in_app_notification_preferences) {
      setInAppPrefs((current) => ({ ...current, ...profile.in_app_notification_preferences }));
    }
  }, [profile]);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

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
      showToast({ title: 'Email notification preferences saved', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Could not save preferences', description: err.message, variant: 'error' });
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSaveInAppNotifications = async (e) => {
    e.preventDefault();
    setSavingInAppNotifications(true);
    try {
      await updateInAppNotificationPreferences({
        inAppNotificationsEnabled,
        inAppNotificationPreferences: inAppPrefs,
      });
      await queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast({ title: 'In-app notification preferences saved', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Could not save preferences', description: err.message, variant: 'error' });
    } finally {
      setSavingInAppNotifications(false);
    }
  };

  const handleTogglePush = async () => {
    if (pushEnabled) {
      await unsubscribeFromPush();
      setPushEnabled(false);
      showToast({ title: 'Push notifications disabled', variant: 'info' });
      return;
    }
    const granted = await requestPushPermission();
    setPushEnabled(granted);
    if (granted) {
      showToast({ title: 'Push notifications enabled', variant: 'success' });
    } else {
      showToast({ title: 'Push permission denied', variant: 'error' });
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading settings…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Settings</p>
        <h2 className="font-display text-2xl font-bold">Workspace Settings</h2>
        <p className="text-muted-foreground">Workspace, profile, clients, team, notifications, and Meta accounts</p>
      </div>

      <TabsRoot value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {showWorkspaceTab && <TabsTrigger value="workspace">Workspace</TabsTrigger>}
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {showClientsTab && <TabsTrigger value="clients">Clients</TabsTrigger>}
          {showTeamTab && <TabsTrigger value="team">Team</TabsTrigger>}
          {showMetaTab && <TabsTrigger value="meta">Meta Accounts</TabsTrigger>}
        </TabsList>

        {showWorkspaceTab && (
          <TabsContent value="workspace">
            <WorkspacePanel />
          </TabsContent>
        )}

        <TabsContent value="profile" className="space-y-6">
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
          <CardTitle>In-app notifications</CardTitle>
          <CardDescription>
            Control what appears in the notification bell and optional browser push alerts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveInAppNotifications} className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inAppNotificationsEnabled}
                onChange={(e) => setInAppNotificationsEnabled(e.target.checked)}
              />
              In-app alerts (notification bell)
            </label>
            {inAppNotificationsEnabled && (
              <div className="space-y-2 pl-6 text-sm">
                {Object.entries(IN_APP_PREF_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={inAppPrefs[key] !== false}
                      onChange={(e) => setInAppPrefs((current) => ({
                        ...current,
                        [key]: e.target.checked,
                      }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
            {isPushSupported() && (
              <div className="border-t border-neutral-100 pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pushEnabled}
                    onChange={handleTogglePush}
                  />
                  Browser push notifications (when tab is in background)
                </label>
              </div>
            )}
            <Button type="submit" disabled={savingInAppNotifications}>
              {savingInAppNotifications ? 'Saving…' : 'Save in-app preferences'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email notifications</CardTitle>
          <CardDescription>
            Optional email alerts — separate from in-app notifications.
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
              {savingNotifications ? 'Saving…' : 'Save email preferences'}
            </Button>
          </form>
        </CardContent>
      </Card>
        </TabsContent>

        {showClientsTab && (
          <TabsContent value="clients">
            <ClientsPanel />
          </TabsContent>
        )}

        {showTeamTab && (
          <TabsContent value="team">
            <TeamPanel />
          </TabsContent>
        )}

        {showMetaTab && (
          <TabsContent value="meta">
            <MetaConnectionPanel />
          </TabsContent>
        )}
      </TabsRoot>
    </div>
  );
}
