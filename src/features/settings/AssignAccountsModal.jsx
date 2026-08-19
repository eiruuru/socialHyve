import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DialogRoot, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { SocialPageAvatar } from '@/components/brand/SocialPageAvatar';
import { assignSocialAccountToClient, listUnassignedMetaPages } from '@/lib/metaAccounts';
import { showToast } from '@/lib/toast';

export function AssignAccountsModal({
  open,
  onOpenChange,
  clientId,
  clientName,
  onAssigned,
}) {
  const queryClient = useQueryClient();
  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !clientId) return;
    setLoading(true);
    listUnassignedMetaPages()
      .then((rows) => {
        setPages(rows);
        setSelected([]);
      })
      .catch((err) => {
        showToast({ title: 'Could not load pages', description: err.message, variant: 'error' });
      })
      .finally(() => setLoading(false));
  }, [open, clientId]);

  const toggle = (id) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleAssign = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      for (const pageId of selected) {
        await assignSocialAccountToClient(pageId, clientId);
      }
      await queryClient.invalidateQueries({ queryKey: ['workspace-meta-pages'] });
      await onAssigned?.();
      onOpenChange(false);
    } catch (err) {
      showToast({ title: 'Could not assign pages', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign pages to {clientName || 'this client'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choose unassigned Facebook Pages and Instagram accounts from your organization pool.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading available pages...</p>
        ) : pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No unassigned pages available. Connect more pages under Settings → Meta Accounts first.
          </p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {pages.map((page) => {
              const label = page.platform === 'instagram'
                ? `@${page.username || page.name}`
                : page.name;
              return (
                <label
                  key={page.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50 has-[:checked]:border-honey-dark has-[:checked]:bg-honey/10"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(page.id)}
                    onChange={() => toggle(page.id)}
                    className="accent-honey-dark"
                  />
                  <SocialPageAvatar
                    platform={page.platform}
                    profilePictureUrl={page.profile_picture_url}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <PlatformChip platform={page.platform} className="w-fit" />
                    <span className="block truncate font-medium">{label}</span>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={saving || !selected.length}>
            {saving ? 'Assigning…' : `Assign ${selected.length || ''} page${selected.length === 1 ? '' : 's'}`.trim()}
          </Button>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
