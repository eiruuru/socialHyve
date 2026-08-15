import { Globe, MessageCircle, Share2, ThumbsUp } from 'lucide-react';
import { MediaCarousel } from './MediaCarousel';
import { normalizeMediaList, isVideo } from './mediaUtils';
import { ProfileAvatar, usePreviewAccounts } from '../hooks/usePreviewAccounts';

function FacebookCollage({ items }) {
  const count = items.length;

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {items.map((item, i) => (
          <img key={i} src={item.public_url} alt="" className="aspect-square w-full object-cover" />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        <img src={items[0].public_url} alt="" className="row-span-2 h-full min-h-[240px] w-full object-cover" />
        <img src={items[1].public_url} alt="" className="aspect-square w-full object-cover" />
        <img src={items[2].public_url} alt="" className="aspect-square w-full object-cover" />
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {items.map((item, i) => (
          <img key={i} src={item.public_url} alt="" className="aspect-square w-full object-cover" />
        ))}
      </div>
    );
  }

  return null;
}

function FacebookMedia({ items }) {
  if (!items.length) return null;

  if (items.length === 1) {
    const item = items[0];
    if (isVideo(item.mime_type)) {
      return (
        <div className="relative bg-black">
          <video src={item.public_url} className="max-h-[500px] w-full object-cover" muted playsInline />
        </div>
      );
    }
    return <img src={item.public_url} alt="" className="max-h-[500px] w-full object-cover" />;
  }

  if (items.length >= 2 && items.length <= 4) {
    return <FacebookCollage items={items} />;
  }

  return <MediaCarousel items={items} platform="facebook" showCounter aspectClassName="aspect-[4/3]" />;
}

export function FacebookFeedPreview({ caption, media = [], embedded = false }) {
  const { facebook } = usePreviewAccounts();
  const items = normalizeMediaList(media);

  return (
    <div className={embedded ? 'bg-white' : 'overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'}>
      <div className="flex items-start gap-2 px-3 py-3">
        <ProfileAvatar account={facebook} platform="facebook" className="h-10 w-10" />
        <div>
          <p className="text-[15px] font-semibold leading-tight text-gray-900">{facebook.name}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>Just now</span>
            <span>·</span>
            <Globe className="h-3 w-3" />
          </div>
        </div>
      </div>

      {caption && (
        <p className="whitespace-pre-wrap px-3 pb-3 text-[15px] leading-snug text-gray-900">{caption}</p>
      )}

      <FacebookMedia items={items} />

      <div className="flex items-center justify-around border-t border-gray-200 px-4 py-2 text-sm font-medium text-gray-600">
        <span className="flex items-center gap-2"><ThumbsUp className="h-5 w-5" /> Like</span>
        <span className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Comment</span>
        <span className="flex items-center gap-2"><Share2 className="h-5 w-5" /> Share</span>
      </div>
    </div>
  );
}
