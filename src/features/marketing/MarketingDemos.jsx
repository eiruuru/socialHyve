import { PostQueueCard } from '@/features/queue/PostQueueCard';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { cn } from '@/lib/utils';
import { demoMedia, gridFeedImage, MARKETING_FEED_IMAGES } from './marketingFeedImages';

const DEMO_POSTS = [
  {
    id: 'demo-1',
    caption: 'Golden hour brunch — swipe for fall specials.',
    status: 'draft',
    approval_status: 'pending',
    publish_instagram: true,
    publish_facebook: true,
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    post_media: demoMedia(MARKETING_FEED_IMAGES.brunch),
  },
  {
    id: 'demo-2',
    caption: 'Oat milk restock day. That is the whole post.',
    status: 'scheduled',
    approval_status: 'approved',
    publish_facebook: true,
    publish_instagram: false,
    scheduled_at: new Date(Date.now() - 3600000).toISOString(),
    post_media: demoMedia(MARKETING_FEED_IMAGES.latte),
  },
];

function FeedGrid({ highlightIndex = 4, className }) {
  return (
    <div className={cn('grid grid-cols-3 gap-0.5 rounded-hyve-sm bg-neutral-200 p-0.5', className)}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className={cn('relative aspect-square overflow-hidden', i === highlightIndex && 'ring-2 ring-honey ring-inset')}>
          <img src={gridFeedImage(i, highlightIndex)} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

export function QueueDemo() {
  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap gap-2 border-b border-neutral-100 pb-3">
        {['Needs review', 'Approved', 'All active', 'Published'].map((tab, i) => (
          <span
            key={tab}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold',
              i === 0 ? 'bg-honey text-white' : 'bg-neutral-100 text-neutral-600',
            )}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DEMO_POSTS.map((post) => (
          <PostQueueCard key={post.id} post={post} authorEmail="mia@riverstudio.com" showActions={false} />
        ))}
      </div>
    </div>
  );
}

export function ComposerDemo() {
  return (
    <div className="grid gap-0 lg:grid-cols-2">
      <div className="space-y-3 border-r border-neutral-100 p-4">
        <div className="rounded-hyve-sm border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
          Weekend brunch promo — limited seats, book via link in bio.
        </div>
        <div className="flex gap-2">
          <PlatformChip platform="facebook" />
          <PlatformChip platform="instagram" />
        </div>
        <div className="rounded-hyve-sm border border-honey/30 bg-honey-light/20 p-3">
          <p className="text-xs font-semibold text-honey-dark">Fine tune</p>
          <p className="mt-1 text-[11px] text-neutral-600">FB Feed · IG Reels · Shorten URLs · Location tag</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {['Save draft', 'Submit for review', 'Schedule', 'Publish now'].map((action, i) => (
            <span
              key={action}
              className={cn(
                'rounded-md border px-2 py-1 font-medium',
                i === 1 ? 'border-honey bg-honey text-white' : 'border-neutral-200 text-neutral-600',
              )}
            >
              {action}
            </span>
          ))}
        </div>
      </div>
      <div className="bg-neutral-50 p-4">
        <div className="mb-2 flex gap-2">
          {['FB Feed', 'IG Feed', 'IG Grid', 'IG Reels'].map((tab, i) => (
            <span
              key={tab}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                i === 2 ? 'bg-pink-100 text-pink-800' : 'bg-white text-neutral-500 ring-1 ring-neutral-200',
              )}
            >
              {tab}
            </span>
          ))}
        </div>
        <FeedGrid highlightIndex={4} />
      </div>
    </div>
  );
}

export function CalendarDemo() {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-neutral-600">
        <span>August 2026</span>
        <span className="text-honey-dark">Month · Week</span>
      </div>
      <div className="grid grid-cols-7 gap-px bg-neutral-200">
        {days.map((day) => (
          <div key={day} className="min-h-[52px] bg-white p-1 text-[10px] text-neutral-400">
            {day}
            {day === 12 && (
              <div className="mt-1 overflow-hidden rounded-sm ring-1 ring-honey-dark/20">
                <img src={MARKETING_FEED_IMAGES.brunch} alt="" className="aspect-square w-full object-cover" />
              </div>
            )}
            {day === 19 && (
              <div className="mt-1 rounded-sm bg-red-50 px-1 py-0.5 text-[9px] font-medium text-red-700">
                Past due
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InteractionsDemo() {
  const threads = [
    { platform: 'instagram', name: '@cafefan22', preview: 'Is the oat milk latte still on the menu?' },
    { platform: 'facebook', name: 'Jamie Rivera', preview: 'Can we book a table for 6 on Saturday?' },
    { platform: 'instagram', name: 'DM · @newguest', preview: 'Do you have vegan options?' },
  ];

  return (
    <div className="grid gap-0 md:grid-cols-[220px_1fr]">
      <div className="space-y-1 border-r border-neutral-100 p-3">
        {threads.map((thread) => (
          <div key={thread.preview} className="rounded-hyve-sm border border-neutral-200 bg-white px-2 py-2">
            <div className="flex items-center gap-2">
              <PlatformChip platform={thread.platform} className="scale-90" />
              <span className="truncate text-xs font-semibold">{thread.name}</span>
            </div>
            <p className="mt-1 truncate text-[11px] text-neutral-500">{thread.preview}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">@cafefan22</p>
          <StatusBadge status="published" className="text-[10px]" />
        </div>
        <div className="overflow-hidden rounded-hyve-sm">
          <img src={MARKETING_FEED_IMAGES.latte} alt="" className="aspect-video w-full object-cover" />
        </div>
        <div className="rounded-hyve-sm bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
          Is the oat milk latte still on the menu?
        </div>
        <div className="rounded-hyve-sm border border-neutral-200 px-3 py-2 text-xs text-neutral-500">
          Reply from River Café…
        </div>
      </div>
    </div>
  );
}

export function PreviewGridDemo() {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-center gap-2">
        {['IG Feed', 'IG Grid', 'IG Reels'].map((tab, i) => (
          <span
            key={tab}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
              i === 1 ? 'bg-pink-100 text-pink-800' : 'bg-neutral-100 text-neutral-500',
            )}
          >
            {tab}
          </span>
        ))}
      </div>
      <FeedGrid highlightIndex={4} className="bg-neutral-100 p-3" />
      <p className="mt-2 text-center text-xs text-neutral-500">Draft highlighted · toggle future scheduled posts</p>
    </div>
  );
}

export function ClientsGridDemo() {
  const clients = [
    { name: 'River Café', pages: '2 pages', timezone: 'Asia/Manila', image: MARKETING_FEED_IMAGES.brunch },
    { name: 'River Retail', pages: '1 page', timezone: 'Asia/Manila', image: MARKETING_FEED_IMAGES.retail },
    { name: 'Studio Events', pages: 'Unassigned', timezone: 'America/New_York', image: MARKETING_FEED_IMAGES.event },
  ];

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <div key={client.name} className="overflow-hidden rounded-hyve-md border border-neutral-200 bg-white shadow-hyve-sm">
          <img src={client.image} alt="" className="aspect-[16/10] w-full object-cover" />
          <div className="p-4">
            <p className="font-display font-bold text-ink">{client.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{client.pages} · {client.timezone}</p>
            <span className="mt-3 inline-block rounded-md bg-honey-light/40 px-2 py-1 text-[11px] font-semibold text-honey-dark">
              Open calendar
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
