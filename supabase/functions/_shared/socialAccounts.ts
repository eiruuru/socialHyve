export type SocialAccount = {
  id: string;
  platform: string;
  is_primary?: boolean;
  page_id?: string | null;
  [key: string]: unknown;
};

export function pickPrimaryAccount(accounts: SocialAccount[] | null | undefined, platform: string) {
  const rows = (accounts || []).filter((a) => a.platform === platform);
  if (!rows.length) return null;
  return rows.find((a) => a.is_primary) || rows[0];
}

export function pickPrimaryPair(accounts: SocialAccount[] | null | undefined) {
  return {
    facebook: pickPrimaryAccount(accounts, 'facebook'),
    instagram: pickPrimaryAccount(accounts, 'instagram'),
  };
}
