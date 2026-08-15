import { useQuery } from '@tanstack/react-query';
import { listSocialAccounts } from '@/lib/posts';
import { getActiveClientId } from '@/lib/clientContext';
import { findAccountById, pickPrimaryAccount, toPreviewAccount } from '@/lib/socialAccounts';

export function usePreviewAccounts({
  facebookAccountId = null,
  instagramAccountId = null,
  clientId: clientIdProp = null,
} = {}) {
  const clientId = clientIdProp || getActiveClientId();
  const { data: accounts = [] } = useQuery({
    queryKey: ['social-accounts', clientId],
    queryFn: listSocialAccounts,
    enabled: !!clientId,
  });

  const facebook = findAccountById(accounts, facebookAccountId, 'facebook')
    || pickPrimaryAccount(accounts, 'facebook');
  const instagram = findAccountById(accounts, instagramAccountId, 'instagram')
    || pickPrimaryAccount(accounts, 'instagram');

  return {
    facebook: toPreviewAccount(facebook, 'facebook'),
    instagram: toPreviewAccount(instagram, 'instagram'),
  };
}

function Avatar({ name, url, className = 'h-8 w-8', platform = 'instagram' }) {
  const initials = (name || '?').slice(0, 1).toUpperCase();
  if (url) {
    return <img src={url} alt="" className={`${className} rounded-full object-cover`} />;
  }
  const placeholderClass =
    platform === 'facebook'
      ? 'bg-blue-600'
      : 'bg-gradient-to-br from-purple-500 to-pink-500';
  return (
    <div className={`${className} flex items-center justify-center rounded-full ${placeholderClass} text-xs font-bold text-white`}>
      {initials}
    </div>
  );
}

export function ProfileAvatar({ account, className, platform = 'instagram' }) {
  return (
    <Avatar
      name={account?.name}
      url={account?.profilePictureUrl}
      className={className}
      platform={platform}
    />
  );
}
