import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { HexMark } from '@/components/brand/HexMark';
import { Button } from '@/components/ui/button';
import { PostQueueCard } from '@/features/queue/PostQueueCard';
import {
  Building2,
  Calendar,
  ClipboardCheck,
  Eye,
  FileSpreadsheet,
  Grid3X3,
  Link2,
  Palette,
  User,
  Users,
} from 'lucide-react';

const DEMO_POSTS = [
  {
    id: 'demo-1',
    caption: '"Golden hour hits different when the menu does too ☀️🍜 — swipe for the new fall specials..."',
    status: 'draft',
    approval_status: 'pending',
    publish_instagram: true,
    publish_facebook: false,
    post_media: [],
  },
  {
    id: 'demo-2',
    caption: '"We restocked the oat milk. That\'s the whole post. That\'s it."',
    status: 'scheduled',
    approval_status: 'approved',
    publish_facebook: true,
    publish_instagram: false,
    scheduled_at: new Date().toISOString(),
    post_media: [],
  },
];

const FEATURES = [
  {
    icon: Building2,
    title: 'Multi-client workspace',
    desc: 'Manage every brand from one hive — switch clients instantly without mixing posts or approvals.',
  },
  {
    icon: Link2,
    title: 'Per-client Meta',
    desc: 'Connect Facebook Pages and Instagram Business accounts separately for each client.',
  },
  {
    icon: ClipboardCheck,
    title: 'Approval queue',
    desc: 'Review pending posts in list or grid view with urgency borders for time-sensitive schedules.',
  },
  {
    icon: Grid3X3,
    title: 'IG grid preview',
    desc: 'See how a draft fits your Instagram aesthetic alongside recent and future scheduled posts.',
  },
  {
    icon: Palette,
    title: 'Canva import',
    desc: 'Pull finished designs from Canva straight into the composer — no manual downloads.',
  },
  {
    icon: FileSpreadsheet,
    title: 'CSV import',
    desc: 'Bulk-upload a content calendar from a spreadsheet and refine drafts before approval.',
  },
  {
    icon: Users,
    title: 'Client review portal',
    desc: 'Share a review link so client approvers can approve or request changes without full app access.',
  },
  {
    icon: User,
    title: 'Account settings',
    desc: 'Update your profile, email, password, and opt in to workflow email notifications.',
  },
];

const FAQ_TEASERS = [
  { q: 'How do I connect Meta for a new client?', a: 'Clients → select client → Settings → Accounts.' },
  { q: 'Can approvers work without a full login?', a: 'Yes — send them a client review link.' },
  { q: 'Can I schedule FB and IG differently?', a: 'Use Fine tune in the composer for per-platform overrides.' },
];

function ChromeFrame({ url, children }) {
  return (
    <div className="overflow-hidden rounded-hyve-lg border border-neutral-200 bg-white shadow-hyve-md">
      <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-100 px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#EF6A5F]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#F5BD4F]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#61C454]" />
        <span className="ml-2.5 rounded-md border border-neutral-200 bg-white px-2.5 py-0.5 font-mono text-[11px] text-neutral-500">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function LandingPage() {
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
        className="border-b border-neutral-200 px-6 py-20"
        style={{
          background: `
            radial-gradient(circle at 15% 18%, rgba(246,166,0,.22), transparent 55%),
            radial-gradient(circle at 85% 0%, rgba(255,199,44,.28), transparent 45%),
            var(--paper)
          `,
        }}
      >
        <div className="mx-auto max-w-3xl">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-600">
            <HexMark size={16} />
            Social scheduling &amp; approval
          </span>
          <h1 className="font-display text-5xl font-bold leading-tight text-ink md:text-6xl">
            The hive for every <span className="text-honey-dark">post</span>,<br />
            from draft to published.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-neutral-600">
            Draft, review, and publish Instagram and Facebook posts together — without the group-chat chaos.
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
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Workflow</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Draft → Review → Publish</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { title: 'Draft', desc: 'Compose posts with live FB & IG previews and carousel support.' },
            { title: 'Review', desc: 'Submit for approval, collect feedback, and get the nod before going live.' },
            { title: 'Publish', desc: 'Schedule or publish instantly to Facebook and Instagram.' },
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
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-hyve-lg border border-neutral-200 bg-white p-5 shadow-hyve-sm"
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

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="mb-6 text-center font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">
          Approval queue
        </p>
        <ChromeFrame url="app.socialhyve.com/queue">
          <div className="space-y-3 p-5">
            {DEMO_POSTS.map((post) => (
              <PostQueueCard key={post.id} post={post} authorEmail="mia@example.com" showActions={false} />
            ))}
          </div>
        </ChromeFrame>
      </section>

      <section className="border-t border-neutral-200 bg-paper-alt px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-center gap-2 text-honey-dark">
            <Eye className="h-4 w-4" />
            <p className="font-mono text-xs font-semibold uppercase tracking-wider">Live previews</p>
          </div>
          <ChromeFrame url="app.socialhyve.com/posts/new · instagram grid">
            <div className="grid grid-cols-3 gap-0.5 bg-neutral-100 p-4">
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className={`aspect-square bg-neutral-200 ${i === 4 ? 'ring-2 ring-honey ring-inset bg-gradient-to-br from-honey-light to-amber-bright' : ''}`}
                />
              ))}
            </div>
            <div className="border-t border-neutral-200 px-4 py-3 text-center text-xs text-neutral-500">
              Draft highlighted in grid · toggle future scheduled posts
            </div>
          </ChromeFrame>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-hyve-lg border border-neutral-200 bg-white p-8 shadow-hyve-sm md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">FAQ</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Questions? We wrote it down.</h2>
              <p className="mt-2 max-w-md text-sm text-neutral-600">
                Step-by-step help for clients, Meta, the composer, approvals, calendar, previews, and more.
              </p>
            </div>
            <Button asChild>
              <Link to="/faq">View all FAQ →</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {FAQ_TEASERS.map(({ q, a }) => (
              <div key={q} className="rounded-hyve-sm border border-neutral-200 bg-paper-alt px-4 py-3">
                <p className="text-sm font-semibold text-ink">{q}</p>
                <p className="mt-1 text-xs text-neutral-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200 px-6 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <Calendar className="mx-auto h-8 w-8 text-honey-dark" />
          <h2 className="mt-4 font-display text-2xl font-bold">Ready to fill the hive?</h2>
          <p className="mt-2 text-neutral-600">Free to start — connect Meta and ship your first approved post today.</p>
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
