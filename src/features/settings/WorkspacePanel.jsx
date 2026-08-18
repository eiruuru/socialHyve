import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOrganization,
  updateOrganizationSettings,
  updateWorkspaceName,
} from '@/lib/organization';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { TimezoneSelect } from '@/components/schedule/TimezoneSelect';
import { getBrowserTimezone } from '@/lib/scheduleTime';
import {
  formatLocaleLabel,
  getBrowserLocale,
  WORKSPACE_LOCALES,
} from '@/lib/workspaceLocales';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function WorkspacePanel() {
  const queryClient = useQueryClient();
  const { refreshWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [locale, setLocale] = useState(getBrowserLocale());
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [savingName, setSavingName] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: getOrganization,
  });

  useEffect(() => {
    if (org?.name) setName(org.name);
  }, [org?.name]);

  useEffect(() => {
    if (!org) return;
    setLocale(org.default_locale || getBrowserLocale());
    setTimezone(org.default_timezone || getBrowserTimezone());
  }, [org?.default_locale, org?.default_timezone, org]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showToast({ title: 'Workspace name required', variant: 'error' });
      return;
    }
    if (trimmed === org?.name) return;

    setSavingName(true);
    try {
      await updateWorkspaceName(trimmed);
      await refreshWorkspace();
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
      showToast({ title: 'Workspace name updated', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Could not save workspace name', description: err.message, variant: 'error' });
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveDefaults = async (e) => {
    e.preventDefault();
    const nextLocale = locale || getBrowserLocale();
    const nextTimezone = timezone || getBrowserTimezone();
    const unchanged = nextLocale === (org?.default_locale || getBrowserLocale())
      && nextTimezone === (org?.default_timezone || getBrowserTimezone());

    if (unchanged) return;

    setSavingDefaults(true);
    try {
      await updateOrganizationSettings({
        default_locale: nextLocale,
        default_timezone: nextTimezone,
      });
      await refreshWorkspace();
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
      showToast({ title: 'Language and region defaults updated', variant: 'success' });
    } catch (err) {
      showToast({
        title: 'Could not save defaults',
        description: err.message,
        variant: 'error',
      });
    } finally {
      setSavingDefaults(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading workspace…</p>;
  }

  const defaultsDirty = locale !== (org?.default_locale || getBrowserLocale())
    || timezone !== (org?.default_timezone || getBrowserTimezone());

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Your workspace name appears in the sidebar. Language, region, and timezone defaults apply
        to new clients and scheduling when a client has not set its own timezone.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Workspace name</CardTitle>
          <CardDescription>
            Shown at the top of the sidebar for everyone in this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="workspace-name" className="block text-xs font-medium">
                Name
              </label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My agency"
                className="max-w-md"
                required
              />
            </div>
            <Button type="submit" disabled={savingName || !name.trim() || name.trim() === org?.name}>
              {savingName ? 'Saving…' : 'Save workspace name'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language and region</CardTitle>
          <CardDescription>
            Default locale for dates and times across the workspace. Individual clients can still
            override the timezone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveDefaults} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="workspace-locale" className="block text-xs font-medium">
                  Language and region
                </label>
                <select
                  id="workspace-locale"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                    'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  {WORKSPACE_LOCALES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Currently {formatLocaleLabel(locale)}. We detect{' '}
                  {formatLocaleLabel(getBrowserLocale())} on this device.
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="workspace-timezone" className="block text-xs font-medium">
                  Default timezone
                </label>
                <TimezoneSelect
                  id="workspace-timezone"
                  value={timezone}
                  onChange={setTimezone}
                />
                <p className="text-[11px] text-muted-foreground">
                  Used for new clients and scheduling when no client timezone is set.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={savingDefaults || !defaultsDirty}>
              {savingDefaults ? 'Saving…' : 'Save language and region defaults'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
