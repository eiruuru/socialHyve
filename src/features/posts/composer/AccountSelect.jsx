import { PlatformChip } from '@/components/brand/PlatformChip';

function accountLabel(account, platform) {
  if (!account) return '';
  return platform === 'instagram'
    ? `@${account.username || account.name}`
    : account.name;
}

export function AccountSelect({ accounts, value, onChange, platform, disabled = false }) {
  if (!accounts?.length || accounts.length <= 1) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <PlatformChip platform={platform} />
        <label className="text-sm font-medium">
          {platform === 'instagram' ? 'Instagram account' : 'Facebook Page'}
        </label>
      </div>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className="h-10 w-full rounded-hyve-sm border border-input bg-background px-3 text-sm"
      >
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {accountLabel(acc, platform)}
          </option>
        ))}
      </select>
    </div>
  );
}
