import { Link } from 'react-router-dom';
import { DocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { Logo } from '@/components/brand/Logo';
import { HexMark } from '@/components/brand/HexMark';
import { Button } from '@/components/ui/button';
import { MarketingChromeFrame } from '@/features/marketing/MarketingChromeFrame';
import { MARKETING_SCREENSHOTS } from '@/features/marketing/marketingAssets';
import {
  CalendarDemo,
  ComposerDemo,
  InteractionsDemo,
  PreviewGridDemo,
  QueueDemo,
} from '@/features/marketing/MarketingDemos';
import {
  Building2,
  Calendar,
  ClipboardCheck,
  Eye,
  Grid3X3,
  Link2,
  MessageSquare,
  Palette,
  SlidersHorizontal,
  Users,
  History,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Building2,
    title: 'Multi-client workspace',
    desc: 'Name your workspace, manage every brand from one hive, and switch clients without mixing posts or approvals.',
  },
  {
    icon: Link2,
    title: 'Workspace Meta pool',
    desc: 'Connect Facebook logins once, import Pages and Instagram accounts, then assign them per client via Social Links.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Fine-Tune overrides',
    desc: 'Per-platform captions, schedules, placements (Feed, Carousel, Reels, Stories), and FB URL shortening.',
  },
  {
    icon: ClipboardCheck,
    title: 'Approval queue',
    desc: 'Review pending posts in a visual grid with Past due urgency, bulk approve, and a Published archive tab.',
  },
  {
    icon: Calendar,
    title: 'Content calendar',
    desc: 'Month and week views, drag to reschedule, spot overdue posts, and bulk-import plans from CSV.',
  },
  {
    icon: Grid3X3,
    title: 'IG grid preview',
    desc: 'See how a draft fits your Instagram aesthetic alongside recent and future scheduled posts.',
  },
  {
    icon: MessageSquare,
    title: 'Interactions inbox',
    desc: 'Reply to Facebook and Instagram comments and DMs in one place — assign, archive, and link to posts.',
  },
  {
    icon: Palette,
    title: 'Canva import',
    desc: 'Pull finished designs from Canva straight into the composer — no manual downloads.',
  },
  {
    icon: Users,
    title: 'Client review portal',
    desc: 'Share a review link so Creatives QA can approve or request changes without full app access.',
  },
  {
    icon: History,
    title: 'Activity log',
    desc: 'Owners and admins can audit post publishes, deletes, and team changes from Settings → Activity.',
  },
];

const FAQ_TEASERS = [
  {
    q: 'How do I connect Meta for a new client?',
    a: 'Settings → Meta Accounts to import pages, then Social Links to assign them to each client.',
    href: '/faq#getting-started',
  },
  {
    q: 'Can I schedule FB and IG differently?',
    a: 'Use Fine tune in the composer for per-platform captions, schedules, and placements.',
    href: '/faq#composer',
  },
  {
    q: 'How does URL shortening work?',
    a: 'Enable Shorten URLs in Fine tune — links become socialhyve.app/s/… when you publish to Facebook.',
    href: '/faq#composer',
  },
  {
    q: 'What happens if approval misses the schedule?',
    a: 'Posts show Past due but do not auto-publish until approved and scheduled.',
    href: '/faq#approval-queue',
  },
  {
    q: 'Can Creatives QA work without a full login?',
    a: 'Yes — send them a client review link or invite them as Creatives QA.',
    href: '/faq#team-roles',
  },
  {
    q: 'Where do comments and DMs show up?',
    a: 'Engagement → Interactions syncs Facebook and Instagram threads for assigned accounts.',
    href: '/faq#interactions',
  },
];

const SHOWCASES = [
  {
    key: 'queue',
    label: 'Approval queue',
    title: 'Review at a glance',
    desc: 'Needs review, Approved, All active, and Published tabs — with urgency badges and bulk approve.',
    asset: MARKETING_SCREENSHOTS.queue,
    Demo: QueueDemo,
  },
  {
    key: 'composer',
    label: 'Composer + Fine-Tune',
    title: 'Draft once, tune per platform',
    desc: 'Live previews, AI Caption, Canva import, and optional Fine-Tune for FB/IG overrides.',
    asset: MARKETING_SCREENSHOTS.composer,
    Demo: ComposerDemo,
    altBg: true,
  },
  {
    key: 'calendar',
    label: 'Content calendar',
    title: 'Plan and reschedule visually',
    desc: 'Month or week view, drag posts to new dates, and spot Past due content while planning.',
    asset: MARKETING_SCREENSHOTS.calendar,
    Demo: CalendarDemo,
  },
  {
    key: 'interactions',
    label: 'Interactions',
    title: 'One inbox for comments and DMs',
    desc: 'Sync Facebook and Instagram engagement, reply in-thread, assign teammates, and archive resolved threads.',
    asset: MARKETING_SCREENSHOTS.interactions,
    Demo: InteractionsDemo,
    altBg: true,
  },
  {
    key: 'previewGrid',
    label: 'Live previews',
    title: 'See the grid before you publish',
    desc: 'Toggle IG grid mode to preview how a draft sits among recent and scheduled posts.',
    asset: MARKETING_SCREENSHOTS.previewGrid,
    Demo: PreviewGridDemo,
  },
];

function ShowcaseSection({ label, title, desc, asset, Demo, altBg = false, priority = false }) {
  return (
    <section className={altBg ? 'border-t border-neutral-200 bg-paper-alt px-6 py-16' : 'mx-auto max-w-6xl px-6 py-16'}>
      <div className={altBg ? 'mx-auto max-w-6xl' : undefined}>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">{label}</p>
        <h2 className="mt-2 font-display text-3xl font-bold">{title}</h2>
        <p className="mt-2 max-w-2xl text-neutral-600">{desc}</p>
        <div className="mt-8">
          <MarketingChromeFrame
            url={asset.url}
            screenshot={asset.src}
            screenshotAlt={asset.alt}
            priority={priority}
          >
            <Demo />
          </MarketingChromeFrame>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <DocumentMeta title="Social scheduling & approval" description={PAGE_DESCRIPTIONS.landing} />
      <header
        className="border-b border-neutral-200 px-6 py-4"
        style={{
          background: `
            radial-gradient(circle at 15% 18%, rgba(246,166,0,.12), transparent 55%),
            var(--paper)
          `,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo />
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/faq">FAQ</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/app/login?signup=1">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      <section
        className="border-b border-neutral-200 px-6 py-16 md:py-20"
        style={{
          background: `
            radial-gradient(circle at 15% 18%, rgba(246,166,0,.22), transparent 55%),
            radial-gradient(circle at 85% 0%, rgba(255,199,44,.28), transparent 45%),
            var(--paper)
          `,
        }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-600">
              <HexMark size={16} />
              Social scheduling &amp; approval
            </span>
            <h1 className="font-display text-5xl font-bold leading-tight text-ink md:text-6xl">
              The hive for every <span className="text-honey-dark">post</span>,<br />
              from draft to published.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-neutral-600">
              Draft, review, and publish Instagram and Facebook for every client — with Fine-Tune overrides, a shared Meta
              pool, approval queue, calendar, and Interactions inbox in one hive.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/app/login?signup=1">Get started free →</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/faq">Read the FAQ</Link>
              </Button>
            </div>
          </div>
          <MarketingChromeFrame
            url={MARKETING_SCREENSHOTS.composer.url}
            screenshot={MARKETING_SCREENSHOTS.composer.src}
            screenshotAlt={MARKETING_SCREENSHOTS.composer.alt}
            priority
          >
            <ComposerDemo />
          </MarketingChromeFrame>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Workflow</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Draft → Review → Publish</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Draft',
              desc: 'Compose with live FB & IG previews, Canva imports, AI Caption, and optional Fine-Tune per platform.',
            },
            {
              title: 'Review',
              desc: 'Submit for approval, track Past due urgency in the queue, and collect feedback via review links.',
            },
            {
              title: 'Publish',
              desc: 'Schedule or publish to assigned Meta pages — with URL shortening and placement-aware publishing.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-hyve-lg border border-neutral-200 bg-white p-6 shadow-hyve-sm">
              <h3 className="font-display text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-paper-alt px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Features</p>
          <h2 className="mt-2 font-display text-3xl font-bold">Built for agencies and in-house teams</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-hyve-lg border border-neutral-200 bg-white p-5 shadow-hyve-sm xl:col-span-1"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-hyve-sm bg-honey-light/40 text-honey-dark">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="font-display text-base font-bold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {SHOWCASES.map((showcase, index) => (
        <ShowcaseSection key={showcase.key} {...showcase} priority={index === 0} />
      ))}

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-hyve-lg border border-neutral-200 bg-white p-8 shadow-hyve-sm md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">FAQ</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Questions? We wrote it down.</h2>
              <p className="mt-2 max-w-md text-sm text-neutral-600">
                Step-by-step help for workspace setup, Meta pool, Fine-Tune, approvals, calendar, Interactions, and more.
              </p>
            </div>
            <Button asChild>
              <Link to="/faq">View all FAQ →</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FAQ_TEASERS.map(({ q, a, href }) => (
              <Link
                key={q}
                to={href}
                className="rounded-hyve-sm border border-neutral-200 bg-paper-alt px-4 py-3 transition-colors hover:border-honey/40 hover:bg-honey-light/10"
              >
                <p className="text-sm font-semibold text-ink">{q}</p>
                <p className="mt-1 text-xs text-neutral-600">{a}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200 px-6 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <Eye className="mx-auto h-8 w-8 text-honey-dark" />
          <h2 className="mt-4 font-display text-2xl font-bold">Ready to fill the hive?</h2>
          <p className="mt-2 text-neutral-600">
            Free to start — set up your workspace, connect Meta, and ship your first approved post at socialhyve.app.
          </p>
          <Button size="lg" className="mt-6" asChild>
            <Link to="/app/login?signup=1">Get started free →</Link>
          </Button>
        </div>
      </section>

      <footer className="bg-ink px-6 py-10 text-neutral-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Logo variant="dark" />
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link to="/faq" className="transition-colors hover:text-white">
              FAQ
            </Link>
            <Link to="/app/login" className="transition-colors hover:text-white">
              Sign in
            </Link>
            <span>socialHyve · Schedule smarter, approve faster.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
