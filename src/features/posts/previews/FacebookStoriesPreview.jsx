import { Heart, MessageCircle, MoreHorizontal, Send, ThumbsUp } from 'lucide-react';
import { ProfileAvatar, usePreviewAccounts } from '../hooks/usePreviewAccounts';
import { normalizeMediaList } from './mediaUtils';

export function FacebookStoriesPreview({ caption, media = [], facebookAccountId = null }) {
  const { facebook } = usePreviewAccounts({ facebookAccountId });
  const items = normalizeMediaList(media);
  const first = items[0];

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-xl bg-neutral-900">
      {first?.public_url ? (
        <img src={first.public_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-white/70">
          Add media for Stories preview
        </div>
      )}

      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-4">
        <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-white/40" />
        <div className="flex items-center gap-2">
          <ProfileAvatar account={facebook} platform="facebook" className="h-8 w-8 ring-2 ring-blue-500" />
          <span className="text-sm font-semibold text-white">{facebook.name}</span>
        </div>
      </div>

      {caption && (
        <div className="absolute inset-x-0 bottom-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-12">
          <p className="line-clamp-4 text-sm leading-snug text-white">{caption}</p>
        </div>
      )}

      <div className="absolute bottom-4 right-3 flex flex-col items-center gap-4 text-white">
        <ThumbsUp className="h-6 w-6" strokeWidth={1.5} />
        <Heart className="h-6 w-6" strokeWidth={1.5} />
        <MessageCircle className="h-6 w-6" strokeWidth={1.5} />
        <Send className="h-6 w-6" strokeWidth={1.5} />
        <MoreHorizontal className="h-6 w-6" strokeWidth={1.5} />
      </div>
    </div>
  );
}
