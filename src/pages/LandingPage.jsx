import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { HexMark } from '@/components/brand/HexMark';
import { Button } from '@/components/ui/button';
import { PostQueueCard } from '@/features/queue/PostQueueCard';

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

function ChromeFrame({ children }) {
  return (
    <div className="overflow-hidden rounded-hyve-lg border border-neutral-200 bg-white shadow-hyve-md">
      <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-100 px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#EF6A5F]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#F5BD4F]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#61C454]" />
        <span className="ml-2.5 rounded-md border border-neutral-200 bg-white px-2.5 py-0.5 font-mono text-[11px] text-neutral-500">
          app.socialhyve.com/queue
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
              <Link to="/app/login">See how it works</Link>
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
        <div className="mx-auto max-w-4xl">
          <p className="mb-6 text-center font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">
            Product preview
          </p>
          <ChromeFrame>
            <div className="space-y-3 p-5">
              {DEMO_POSTS.map((post) => (
                <PostQueueCard key={post.id} post={post} authorEmail="mia@example.com" showActions={false} />
              ))}
            </div>
          </ChromeFrame>
        </div>
      </section>

      <footer className="bg-ink px-6 py-10 text-neutral-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Logo variant="dark" />
          <p className="text-sm">socialHyve · Schedule smarter, approve faster.</p>
        </div>
      </footer>
    </div>
  );
}
