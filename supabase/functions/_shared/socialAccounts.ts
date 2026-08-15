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

export function findAccountById(
  accounts: SocialAccount[] | null | undefined,
  accountId: string | null | undefined,
  platform: string,
) {
  if (!accountId) return null;
  const row = (accounts || []).find((a) => a.id === accountId);
  if (!row || row.platform !== platform) return null;
  return row;
}

export function resolvePostAccounts(
  post: { facebook_account_id?: string | null; instagram_account_id?: string | null } | null | undefined,
  accounts: SocialAccount[] | null | undefined,
) {
  return {
    facebook: findAccountById(accounts, post?.facebook_account_id, 'facebook')
      || pickPrimaryAccount(accounts, 'facebook'),
    instagram: findAccountById(accounts, post?.instagram_account_id, 'instagram')
      || pickPrimaryAccount(accounts, 'instagram'),
  };
}
