import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { DocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { PLANS, PLAN_IDS, SUPPORT_EMAIL } from '@/lib/plans';
import { INVITE_ONLY } from '@/lib/siteConfig';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  MarketingFooter,
  MarketingHeader,
  MarketingPage,
} from '@/features/marketing/MarketingNav';
import { useAuth } from '@/lib/AuthContext';

const COMPARISON_ROWS = [
  { label: 'Approval queue & calendar', starter: true, pro: true },
  { label: 'Facebook & Instagram publishing', starter: true, pro: true },
  { label: 'Meta pool & Social Links', starter: true, pro: true },
  { label: 'Manual media upload', starter: true, pro: true },
  { label: 'AI Caption assistant', starter: true, pro: true },
  { label: 'Interactions inbox', starter: true, pro: true },
  { label: 'Team invites & roles', starter: false, pro: true },
  { label: 'Client member invites', starter: false, pro: true },
  { label: 'Canva design import', starter: false, pro: true },
];

function FeatureCell({ included }) {
  return included ? (
    <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Included" />
  ) : (
    <X className="mx-auto h-4 w-4 text-neutral-300" aria-label="Not included" />
  );
}

function PlanCard({ plan, cta }) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-hyve-lg border bg-white p-6 shadow-hyve-sm',
        plan.highlighted ? 'border-honey ring-2 ring-honey/20' : 'border-neutral-200',
      )}
    >
      {plan.highlighted ? (
        <span className="mb-3 w-fit rounded-full bg-honey px-2.5 py-0.5 text-xs font-semibold text-white">
          Most popular
        </span>
      ) : null}
      <h2 className="font-display text-xl font-bold">{plan.name}</h2>
      <p className="mt-1 text-sm text-neutral-600">{plan.description}</p>
      <div className="mt-4">
        {plan.compareAtPriceLabel ? (
          <p className="text-sm text-neutral-500">
            <span className="line-through">{plan.compareAtPriceLabel}</span>
            <span className="ml-2 rounded-full bg-honey-light px-2 py-0.5 text-xs font-semibold text-honey-dark">
              {plan.priceNote || 'Discounted'}
            </span>
          </p>
        ) : null}
        <p className="font-display text-4xl font-bold text-ink">
          {plan.priceLabel}
          <span className="text-base font-normal text-neutral-500">/{plan.interval}</span>
        </p>
      </div>
      <ul className="mt-6 flex-1 space-y-2 text-sm text-neutral-700">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-honey-dark" />
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}

export default function PricingPage() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const starter = PLANS[PLAN_IDS.STARTER];
  const pro = PLANS[PLAN_IDS.PRO];

  const renderCta = (planId) => {
    if (isLoadingAuth) {
      return <Button className="w-full" disabled>…</Button>;
    }
    if (isAuthenticated) {
      return (
        <Button className="w-full" asChild>
          <Link to={`/app/settings/account?tab=billing&plan=${planId}`}>
            Subscribe to {PLANS[planId].name}
          </Link>
        </Button>
      );
    }
    if (INVITE_ONLY) {
      return (
        <Button className="w-full" asChild>
          <Link to="/waitlist">Join waitlist</Link>
        </Button>
      );
    }
    return (
      <Button className="w-full" asChild>
        <Link to="/app/login">Get started</Link>
      </Button>
    );
  };

  return (
    <MarketingPage>
      <DocumentMeta title="Pricing" description={PAGE_DESCRIPTIONS.pricing} />
      <MarketingHeader backToHome />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Pricing</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
            Simple plans for every hive
          </h1>
          <p className="mt-3 text-neutral-600">
            Billed monthly. Prices exclude applicable taxes — collected by Creem where required.
            Questions?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-honey-dark hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <PlanCard plan={starter} cta={renderCta(PLAN_IDS.STARTER)} />
          <PlanCard plan={pro} cta={renderCta(PLAN_IDS.PRO)} />
        </div>

        <div className="mt-12 overflow-x-auto rounded-hyve-lg border border-neutral-200">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-paper-alt">
                <th className="px-4 py-3 font-medium text-ink">Feature</th>
                <th className="px-4 py-3 text-center font-medium text-ink">Starter</th>
                <th className="px-4 py-3 text-center font-medium text-ink">Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 text-neutral-700">{row.label}</td>
                  <td className="px-4 py-3"><FeatureCell included={row.starter} /></td>
                  <td className="px-4 py-3"><FeatureCell included={row.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-center text-xs text-neutral-500">
          Payments processed by{' '}
          <a href="https://creem.io" className="underline hover:text-ink" target="_blank" rel="noopener noreferrer">
            Creem
          </a>{' '}
          as merchant of record. See our{' '}
          <Link to="/terms" className="underline hover:text-ink">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="underline hover:text-ink">Privacy Policy</Link>.
        </p>
      </main>

      <MarketingFooter />
    </MarketingPage>
  );
}
