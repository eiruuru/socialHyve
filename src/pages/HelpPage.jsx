import { FaqContent } from '@/features/help/FaqContent';

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Settings</p>
        <h2 className="font-display text-2xl font-bold">Help</h2>
        <p className="text-muted-foreground">
          How to use the hive — from first client setup to publishing approved posts.
        </p>
      </div>

      <FaqContent defaultOpenIndex={-1} />
    </div>
  );
}
