import { Globe, MessageCircle, Share2, ThumbsUp } from 'lucide-react';
import { normalizeMediaList, isVideo } from './mediaUtils';
import { ProfileAvatar, usePreviewAccounts } from '../hooks/usePreviewAccounts';
import { cn } from '@/lib/utils';

function CollageTile({ item, className, overlay }) {
  const video = isVideo(item.mime_type);
  return (
    <div className={cn('relative overflow-hidden bg-neutral-900', className)}>
      {video ? (
        <video src={item.public_url} className="h-full w-full object-cover" muted playsInline />
      ) : (
        <img src={item.public_url} alt="" className="h-full w-full object-cover" />
      )}
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <span className="text-2xl font-bold text-white">{overlay}</span>
        </div>
      )}
    </div>
  );
}

function FacebookCollage({ items }) {
  const count = items.length;

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {items.map((item, i) => (
          <CollageTile key={i} item={item} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid aspect-square grid-cols-3 grid-rows-2 gap-0.5">
        <CollageTile item={items[0]} className="col-span-2 row-span-2 h-full w-full" />
        <CollageTile item={items[1]} className="col-start-3 row-start-1 h-full w-full" />
        <CollageTile item={items[2]} className="col-start-3 row-start-2 h-full w-full" />
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="grid min-h-[320px] grid-cols-3 grid-rows-3 gap-0.5">
        <CollageTile item={items[0]} className="col-span-2 row-span-3 h-full w-full" />
        <CollageTile item={items[1]} className="col-start-3 row-start-1 h-full w-full" />
        <CollageTile item={items[2]} className="col-start-3 row-start-2 h-full w-full" />
        <CollageTile item={items[3]} className="col-start-3 row-start-3 h-full w-full" />
      </div>
    );
  }

  const extra = count - 5;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="grid grid-cols-2 gap-0.5">
        <CollageTile item={items[0]} className="h-[200px] w-full" />
        <CollageTile item={items[1]} className="h-[200px] w-full" />
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        <CollageTile item={items[2]} className="aspect-square w-full" />
        <CollageTile item={items[3]} className="aspect-square w-full" />
        <CollageTile
          item={items[4]}
          className="aspect-square w-full"
          overlay={extra > 0 ? `+${extra}` : null}
        />
      </div>
    </div>
  );
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

  return <FacebookCollage items={items} />;
}

export function FacebookFeedPreview({
  caption,
  media = [],
  embedded = false,
  facebookAccountId = null,
  carouselMode = false,
}) {
  const { facebook } = usePreviewAccounts({ facebookAccountId });
  const items = normalizeMediaList(media);
  const showCarousel = carouselMode && items.length > 1;

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

      {showCarousel && (
        <p className="px-3 pb-2 text-xs font-medium text-blue-600">Carousel · {items.length} items</p>
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
