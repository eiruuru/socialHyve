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

export function findLinkedInstagram(accounts, facebookAccount) {
  if (!facebookAccount?.page_id) return null;
  return (accounts || []).find(
    (a) => a.platform === 'instagram' && a.page_id === facebookAccount.page_id,
  ) || null;
}
