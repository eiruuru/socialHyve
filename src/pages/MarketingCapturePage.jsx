import {
  CalendarDemo,
  ClientsGridDemo,
  ComposerDemo,
  InteractionsDemo,
  PreviewGridDemo,
  QueueDemo,
} from '@/features/marketing/MarketingDemos';

const CAPTURES = [
  { id: 'queue', Demo: QueueDemo },
  { id: 'composer', Demo: ComposerDemo },
  { id: 'calendar', Demo: CalendarDemo },
  { id: 'interactions', Demo: InteractionsDemo },
  { id: 'preview-grid', Demo: PreviewGridDemo },
  { id: 'settings-clients', Demo: ClientsGridDemo },
];

/** Internal page for regenerating marketing screenshots (content only — no chrome bar). */
export default function MarketingCapturePage() {
  return (
    <div className="min-h-screen bg-white p-8">
      {CAPTURES.map(({ id, Demo }) => (
        <div key={id} id={`capture-${id}`} className="mx-auto mb-12 w-full max-w-6xl overflow-hidden rounded-hyve-lg border border-neutral-200 bg-white shadow-hyve-md">
          <Demo />
        </div>
      ))}
    </div>
  );
}
