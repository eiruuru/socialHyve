export function pickPrimaryAccount(accounts, platform) {
  const rows = (accounts || []).filter((a) => a.platform === platform);
  if (!rows.length) return null;
  return rows.find((a) => a.is_primary) || rows[0];
}

export function pickPrimaryPair(accounts) {
  return {
    facebook: pickPrimaryAccount(accounts, 'facebook'),
    instagram: pickPrimaryAccount(accounts, 'instagram'),
  };
}

export function findAccountById(accounts, accountId, platform) {
  if (!accountId) return null;
  const row = (accounts || []).find((a) => a.id === accountId);
  if (!row || row.platform !== platform) return null;
  return row;
}

export function resolvePostAccounts(post, accounts) {
  const facebook = findAccountById(accounts, post?.facebook_account_id, 'facebook')
    || pickPrimaryAccount(accounts, 'facebook');
  const instagram = findAccountById(accounts, post?.instagram_account_id, 'instagram')
    || pickPrimaryAccount(accounts, 'instagram');
  return { facebook, instagram };
}

export function toPreviewAccount(account, platform) {
  if (!account) {
    if (platform === 'facebook') {
      return { name: 'Your Page', username: 'Your Page', profilePictureUrl: null };
    }
    return { name: 'your_account', username: 'your_account', profilePictureUrl: null };
  }
  if (platform === 'instagram') {
    return {
      name: account.username || account.name,
      username: account.username || account.name?.replace('@', '') || 'your_account',
      profilePictureUrl: account.profile_picture_url,
    };
  }
  return {
    name: account.name,
    username: account.username || account.name,
    profilePictureUrl: account.profile_picture_url,
  };
}

export function findLinkedInstagram(accounts, facebookAccount) {
  if (!facebookAccount?.page_id) return null;
  return (accounts || []).find(
    (a) => a.platform === 'instagram' && a.page_id === facebookAccount.page_id,
  ) || null;
}
