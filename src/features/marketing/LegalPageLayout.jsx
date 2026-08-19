import { Link } from 'react-router-dom';
import { MarketingHeader, MarketingPage } from '@/features/marketing/MarketingNav';
import { DocumentMeta } from '@/components/DocumentMeta';
import { WAITLIST_EMAIL } from '@/lib/siteConfig';

export function LegalPageLayout({ title, description, children }) {
  return (
    <MarketingPage>
      <DocumentMeta title={title} description={description} />
      <MarketingHeader backToHome />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Legal</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-neutral-500">
          Last updated: August 2026 · Questions?{' '}
          <a href={`mailto:${WAITLIST_EMAIL}`} className="font-medium text-honey-dark hover:underline">
            {WAITLIST_EMAIL}
          </a>
        </p>
        <div className="prose prose-neutral mt-8 max-w-none space-y-4 text-sm leading-relaxed text-neutral-700 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-paper-alt px-4 py-8 text-center text-sm text-neutral-500 sm:px-6">
        <Link to="/" className="font-medium text-honey-dark hover:underline">
          ← socialHyve home
        </Link>
      </footer>
    </MarketingPage>
  );
}
