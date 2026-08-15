import { Heart, MessageCircle, MoreHorizontal, Music2, Send } from 'lucide-react';
import { ProfileAvatar, usePreviewAccounts } from '../hooks/usePreviewAccounts';
import { isVideo, normalizeMediaList } from './mediaUtils';

export function InstagramReelsPreview({ caption, media = [] }) {
  const { instagram } = usePreviewAccounts();
  const items = normalizeMediaList(media);
  const first = items[0];
  const username = instagram.username?.replace('@', '') || 'your_account';
  const videoItem = items.find((m) => isVideo(m.mime_type)) || first;

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-xl bg-black">
      {videoItem?.public_url ? (
        isVideo(videoItem.mime_type) ? (
          <video
            src={videoItem.public_url}
            className="h-full w-full object-cover"
            muted
            playsInline
            loop
          />
        ) : (
          <img src={videoItem.public_url} alt="" className="h-full w-full object-cover" />
        )
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-white/70">
          Add a video for Reels preview
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 pt-16">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1 text-white">
            <div className="mb-2 flex items-center gap-2">
              <ProfileAvatar account={instagram} platform="instagram" className="h-8 w-8 ring-2 ring-white" />
              <span className="text-sm font-semibold">{username}</span>
            </div>
            {caption && (
              <p className="line-clamp-3 text-sm leading-snug">{caption}</p>
            )}
            <div className="mt-2 flex items-center gap-1 text-xs text-white/80">
              <Music2 className="h-3 w-3" />
              <span>Original audio</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-4 text-white">
            <Heart className="h-6 w-6" strokeWidth={1.5} />
            <MessageCircle className="h-6 w-6" strokeWidth={1.5} />
            <Send className="h-6 w-6" strokeWidth={1.5} />
            <MoreHorizontal className="h-6 w-6" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
}
