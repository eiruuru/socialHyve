import { DocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { FaqContent } from '@/features/help/FaqContent';
import { MarketingHeader, MarketingPage } from '@/features/marketing/MarketingNav';
import { Link } from 'react-router-dom';

export default function FaqPage() {
  return (
    <MarketingPage>
      <DocumentMeta title="FAQ" description={PAGE_DESCRIPTIONS.faq} />
      <MarketingHeader backToHome />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Help</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-3 text-sm text-neutral-600 sm:text-base">
          Step-by-step guides for workspace setup, Fine-Tune overrides, approvals, calendar, Interactions inbox, URL
          shortener, team roles, and notifications.
        </p>
        <FaqContent className="mt-8 sm:mt-10" />
      </main>

      <footer className="border-t border-neutral-200 bg-paper-alt px-4 py-8 text-center text-sm text-neutral-500 sm:px-6">
        <Link to="/" className="font-medium text-honey-dark hover:underline">
          ← socialHyve home
        </Link>
      </footer>
    </MarketingPage>
  );
}
