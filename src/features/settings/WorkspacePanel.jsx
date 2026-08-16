import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrganization, updateWorkspaceName } from '@/lib/organization';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function WorkspacePanel() {
  const queryClient = useQueryClient();
  const { refreshWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: getOrganization,
  });

  useEffect(() => {
    if (org?.name) setName(org.name);
  }, [org?.name]);

  const handleSave = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showToast({ title: 'Workspace name required', variant: 'error' });
      return;
    }
    if (trimmed === org?.name) return;

    setSaving(true);
    try {
      await updateWorkspaceName(trimmed);
      await refreshWorkspace();
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
      showToast({ title: 'Workspace name updated', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Could not save workspace name', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading workspace…</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Your workspace name appears in the top bar and helps teammates identify this organization.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Workspace name</CardTitle>
          <CardDescription>
            Shown beside Sign out in the header for everyone in this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
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
            <Button type="submit" disabled={saving || !name.trim() || name.trim() === org?.name}>
              {saving ? 'Saving…' : 'Save workspace name'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
