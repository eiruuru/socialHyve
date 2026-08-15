import { useQuery } from '@tanstack/react-query';
import { listSocialAccounts } from '@/lib/posts';
import { getActiveClientId } from '@/lib/clientContext';

export function usePreviewAccounts() {
  const clientId = getActiveClientId();
  const { data: accounts = [] } = useQuery({
    queryKey: ['social-accounts', clientId],
    queryFn: listSocialAccounts,
  });

  const facebook = accounts.find((a) => a.platform === 'facebook');
  const instagram = accounts.find((a) => a.platform === 'instagram');

  return {
    facebook: facebook
      ? {
          name: facebook.name,
          username: facebook.username || facebook.name,
          profilePictureUrl: facebook.profile_picture_url,
        }
      : { name: 'Your Page', username: 'Your Page', profilePictureUrl: null },
    instagram: instagram
      ? {
          name: instagram.username || instagram.name,
          username: instagram.username || instagram.name?.replace('@', '') || 'your_account',
          profilePictureUrl: instagram.profile_picture_url,
        }
      : { name: 'your_account', username: 'your_account', profilePictureUrl: null },
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
