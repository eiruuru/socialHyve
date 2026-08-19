import { useEffect, useState } from 'react';
import { DialogRoot, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { SocialPageAvatar } from '@/components/brand/SocialPageAvatar';
import { setPrimarySocialAccount } from '@/lib/posts';
import { findLinkedInstagram } from '@/lib/socialAccounts';
import { showToast } from '@/lib/toast';

function AccountOption({ account, platform, selected, onSelect }) {
  const label = platform === 'instagram' ? `@${account.username || account.name}` : account.name;
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50 has-[:checked]:border-honey-dark has-[:checked]:bg-honey/10">
      <input
        type="radio"
        name={`picker-${platform}`}
        checked={selected}
        onChange={() => onSelect(account.id)}
        className="accent-honey-dark"
      />
      <SocialPageAvatar
        platform={platform}
        profilePictureUrl={account.profile_picture_url}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PlatformChip platform={platform} />
          <span className="truncate font-medium">{label}</span>
        </div>
      </div>
    </label>
  );
}

export function AccountPickerModal({
  open,
  onOpenChange,
  clientName,
  clientId,
  fbAccounts,
  igAccounts,
  onSaved,
}) {
  const primaryFb = fbAccounts.find((a) => a.is_primary) || fbAccounts[0];
  const primaryIg = igAccounts.find((a) => a.is_primary) || igAccounts[0];

  const [fbId, setFbId] = useState(primaryFb?.id || '');
  const [igId, setIgId] = useState(primaryIg?.id || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFbId(primaryFb?.id || '');
    setIgId(primaryIg?.id || '');
  }, [open, primaryFb?.id, primaryIg?.id]);

  useEffect(() => {
    const fb = fbAccounts.find((a) => a.id === fbId);
    if (!fb) return;
    const linked = findLinkedInstagram(igAccounts, fb);
    if (linked) setIgId(linked.id);
  }, [fbId, fbAccounts, igAccounts]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (fbId) {
        await setPrimarySocialAccount(fbId, { clientId, linkInstagram: true });
      }
      const currentPrimaryIg = igAccounts.find((a) => a.is_primary);
      if (igId && igId !== currentPrimaryIg?.id) {
        await setPrimarySocialAccount(igId, { clientId, linkInstagram: false });
      }
      await onSaved?.();
      onOpenChange(false);
    } catch (err) {
      showToast({ title: 'Could not save defaults', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose default accounts for {clientName || 'this client'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Publishing and previews use these defaults. You can change them anytime on this page.
        </p>

        {fbAccounts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Facebook Page</p>
            <div className="space-y-2">
              {fbAccounts.map((acc) => (
                <AccountOption
                  key={acc.id}
                  account={acc}
                  platform="facebook"
                  selected={fbId === acc.id}
                  onSelect={setFbId}
                />
              ))}
            </div>
          </div>
        )}

        {igAccounts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Instagram account</p>
            <div className="space-y-2">
              {igAccounts.map((acc) => (
                <AccountOption
                  key={acc.id}
                  account={acc}
                  platform="instagram"
                  selected={igId === acc.id}
                  onSelect={setIgId}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Skip for now
          </Button>
          <Button onClick={handleSave} disabled={saving || !fbId}>
            {saving ? 'Saving…' : 'Save defaults'}
          </Button>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
