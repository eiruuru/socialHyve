import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { FaqContent } from '@/features/help/FaqContent';

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header
        className="border-b border-neutral-200 px-6 py-4"
        style={{
          background: `
            radial-gradient(circle at 15% 18%, rgba(246,166,0,.12), transparent 55%),
            var(--paper)
          `,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Logo />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Help</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">Frequently asked questions</h1>
        <p className="mt-3 text-neutral-600">
          Step-by-step guides for workspace setup, composing, approvals, calendar, integrations, roles, and notifications.
        </p>
        <FaqContent className="mt-10" />
      </main>

      <footer className="border-t border-neutral-200 bg-paper-alt px-6 py-8 text-center text-sm text-neutral-500">
        <Link to="/" className="font-medium text-honey-dark hover:underline">
          ← socialHyve home
        </Link>
      </footer>
    </div>
  );
}
