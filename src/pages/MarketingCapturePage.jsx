import { MarketingChromeFrame } from '@/features/marketing/MarketingChromeFrame';
import { MARKETING_SCREENSHOTS } from '@/features/marketing/marketingAssets';
import {
  CalendarDemo,
  ClientsGridDemo,
  ComposerDemo,
  InteractionsDemo,
  PreviewGridDemo,
  QueueDemo,
} from '@/features/marketing/MarketingDemos';

const CAPTURES = [
  { id: 'queue', Demo: QueueDemo, url: MARKETING_SCREENSHOTS.queue.url },
  { id: 'composer', Demo: ComposerDemo, url: MARKETING_SCREENSHOTS.composer.url },
  { id: 'calendar', Demo: CalendarDemo, url: MARKETING_SCREENSHOTS.calendar.url },
  { id: 'interactions', Demo: InteractionsDemo, url: MARKETING_SCREENSHOTS.interactions.url },
  { id: 'preview-grid', Demo: PreviewGridDemo, url: MARKETING_SCREENSHOTS.previewGrid.url },
  { id: 'settings-clients', Demo: ClientsGridDemo, url: MARKETING_SCREENSHOTS.settingsClients.url },
];

export default function MarketingCapturePage() {
  return (
    <div className="min-h-screen bg-neutral-200 p-8">
      {CAPTURES.map(({ id, Demo, url }) => (
        <div key={id} id={`capture-${id}`} className="mx-auto mb-12 max-w-5xl">
          <MarketingChromeFrame url={url}>
            <Demo />
          </MarketingChromeFrame>
        </div>
      ))}
    </div>
  );
}
