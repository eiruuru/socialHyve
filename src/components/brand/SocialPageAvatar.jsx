import { cn } from '@/lib/utils';
import { PlatformChip } from '@/components/brand/PlatformChip';

const AVATAR_SIZE = {
  md: 'h-12 w-12 min-h-12 min-w-12',
  lg: 'h-14 w-14 min-h-14 min-w-14',
};

const FALLBACK_ICON_SIZE = {
  md: 'md',
  lg: 'lg',
};

/** Fixed-size avatar for imported / assigned social pages (photo or platform icon). */
export function SocialPageAvatar({
  platform,
  profilePictureUrl,
  size = 'lg',
  className,
}) {
  const boxClass = AVATAR_SIZE[size] ?? AVATAR_SIZE.lg;
  const iconSize = FALLBACK_ICON_SIZE[size] ?? FALLBACK_ICON_SIZE.lg;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100',
        boxClass,
        className,
      )}
    >
      {profilePictureUrl ? (
        <img
          src={profilePictureUrl}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <PlatformChip platform={platform} iconOnly iconSize={iconSize} />
      )}
    </div>
  );
}
