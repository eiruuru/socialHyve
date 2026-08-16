import { FaqContent } from '@/features/help/FaqContent';
import { DocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <DocumentMeta title="Help" description={PAGE_DESCRIPTIONS.help} />
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Support</p>
        <h2 className="font-display text-2xl font-bold">Help</h2>
        <p className="text-muted-foreground">
          Pick a topic on the left for step-by-step setup, UI locations, and what each feature looks like in the app.
        </p>
      </div>

      <FaqContent />
    </div>
  );
}
