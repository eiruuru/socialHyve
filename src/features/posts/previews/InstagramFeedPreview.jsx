import { useState } from 'react';
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from 'lucide-react';
import { MediaCarousel } from './MediaCarousel';
import { normalizeMediaList, truncateCaption } from './mediaUtils';
import { ProfileAvatar, usePreviewAccounts } from '../hooks/usePreviewAccounts';

export function InstagramFeedPreview({ caption, media = [], embedded = false, instagramAccountId = null }) {
  const { instagram } = usePreviewAccounts({ instagramAccountId });
  const [expanded, setExpanded] = useState(false);
  const items = normalizeMediaList(media);
  const username = instagram.username?.replace('@', '') || 'your_account';
  const { text: truncated, truncated: isTruncated } = truncateCaption(caption, 125);
  const displayCaption = expanded || !isTruncated ? caption : truncated;

  return (
    <div className={embedded ? 'bg-white' : 'mx-auto w-full max-w-[390px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'}>
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <ProfileAvatar account={instagram} platform="instagram" className="h-8 w-8" />
          <span className="text-sm font-semibold text-gray-900">{username}</span>
        </div>
        <MoreHorizontal className="h-5 w-5 text-gray-900" />
      </div>

      <MediaCarousel items={items} platform="instagram" />

      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-4">
          <Heart className="h-6 w-6 text-gray-900" strokeWidth={1.5} />
          <MessageCircle className="h-6 w-6 text-gray-900" strokeWidth={1.5} />
          <Send className="h-6 w-6 text-gray-900" strokeWidth={1.5} />
        </div>
        <Bookmark className="h-6 w-6 text-gray-900" strokeWidth={1.5} />
      </div>

      {caption && (
        <div className="px-3 pb-3 text-sm leading-snug text-gray-900">
          <span className="font-semibold">{username} </span>
          <span className="whitespace-pre-wrap">{displayCaption}</span>
          {isTruncated && !expanded && (
            <button type="button" className="text-gray-500" onClick={() => setExpanded(true)}>
              {' '}more
            </button>
          )}
        </div>
      )}

      {!items.length && (
        <p className="px-3 pb-3 text-xs text-gray-500">Instagram requires at least one image or video.</p>
      )}
    </div>
  );
}
