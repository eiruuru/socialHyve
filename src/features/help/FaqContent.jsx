import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function ChromeFrame({ url, children }) {
  return (
    <div className="overflow-hidden rounded-hyve-lg border border-neutral-200 bg-white shadow-hyve-sm">
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

function FaqSection({ title, summary, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-hyve-lg border border-neutral-200 bg-white shadow-hyve-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-honey-dark focus-visible:ring-offset-2"
        aria-expanded={open}
      >
        <div>
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          {!open && <p className="mt-1 text-sm text-neutral-600">{summary}</p>}
        </div>
        <ChevronDown
          className={cn('mt-1 h-4 w-4 shrink-0 text-neutral-500 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="space-y-4 border-t border-neutral-200 px-5 pb-5 pt-4 text-sm leading-relaxed text-neutral-700">
          {children}
        </div>
      )}
    </div>
  );
}

function Example({ children }) {
  return (
    <p className="rounded-hyve-sm border border-neutral-200 bg-paper-alt px-3 py-2 text-xs text-neutral-600">
      <span className="font-semibold text-honey-dark">Example: </span>
      {children}
    </p>
  );
}

const FAQ_SECTIONS = [
  {
    title: 'Getting started',
    summary: 'Add clients, connect Meta, and publish your first post.',
    content: (
      <>
        <p>
          Start by creating a client under <strong>Clients</strong> — each client is a brand or account you manage.
          Switch clients from the sidebar dropdown; posts, integrations, and approvals are scoped to the active client.
        </p>
        <p>
          Connect Facebook and Instagram under <strong>Settings → Accounts</strong> for that client. You&apos;ll authorize
          Meta once per client so Page and IG Business accounts stay separate.
        </p>
        <p>
          Create your first post from <strong>New Post</strong>: write a caption, attach media, pick FB/IG targets, and
          save as draft or submit for approval.
        </p>
        <Example>
          Add client &quot;River Café&quot;, connect their Meta Page + IG account, then draft a weekend special post and
          submit it for the café owner to approve.
        </Example>
        <ChromeFrame url="app.socialhyve.com/clients">
          <div className="space-y-2 p-4">
            <div className="flex items-center justify-between rounded-hyve-sm border border-neutral-200 px-3 py-2">
              <span className="font-medium">River Café</span>
              <span className="text-xs text-status-published">Meta connected</span>
            </div>
            <div className="flex items-center justify-between rounded-hyve-sm border border-dashed border-neutral-300 px-3 py-2 text-neutral-500">
              + Add client
            </div>
          </div>
        </ChromeFrame>
      </>
    ),
  },
  {
    title: 'Composer',
    summary: 'Captions, media, Canva imports, account picker, and fine-tune overrides.',
    content: (
      <>
        <p>
          The composer is your draft workspace. Write a main caption, upload images or video, and toggle Facebook /
          Instagram publishing with the account picker.
        </p>
        <p>
          Import designs from Canva without leaving the flow — connect Canva per client under Settings, then pick a
          design from the composer media step.
        </p>
        <p>
          Use <strong>Fine tune</strong> to override captions, schedule times, or add an Instagram first comment when
          FB and IG need different copy or timing.
        </p>
        <Example>
          Write one caption for both platforms, then fine-tune IG with a shorter hook and schedule IG 30 minutes after
          Facebook.
        </Example>
        <ChromeFrame url="app.socialhyve.com/posts/new">
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="h-16 rounded-hyve-sm border border-neutral-200 bg-paper-alt px-3 py-2 text-xs text-neutral-500">
                Caption…
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">FB</span>
                <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-800">IG</span>
              </div>
            </div>
            <div className="flex aspect-square items-center justify-center rounded-hyve-sm bg-neutral-200 text-xs text-neutral-500">
              Media / Canva
            </div>
          </div>
        </ChromeFrame>
      </>
    ),
  },
  {
    title: 'Approval queue',
    summary: 'List or grid views, urgency borders, approve or request changes.',
    content: (
      <>
        <p>
          The queue shows every post waiting on review. Switch between <strong>list</strong> and <strong>grid</strong>{' '}
          views — list is great for captions; grid highlights visuals.
        </p>
        <p>
          Scheduled posts get urgency borders and badges (e.g. &quot;Today&quot;, &quot;Soon&quot;) so approvers know what
          needs attention first.
        </p>
        <p>
          Approvers can <strong>Approve</strong> to move a post toward publishing, or <strong>Request changes</strong>{' '}
          with comments that loop back to the author.
        </p>
        <Example>
          A post scheduled for 4 PM today shows an amber urgency border — the client approves from the review link before
          the cutoff.
        </Example>
      </>
    ),
  },
  {
    title: 'Calendar',
    summary: 'Month and list views, drag to reschedule, bulk CSV import.',
    content: (
      <>
        <p>
          The calendar shows scheduled and published posts in <strong>month</strong> or <strong>list</strong> view.
          Drag a post to a new day to reschedule without reopening the composer.
        </p>
        <p>
          Bulk-plan content with <strong>CSV import</strong> under Posts → Import. Map columns to captions, dates, and
          platforms, then review imported drafts in the queue.
        </p>
        <Example>
          Import a 30-day content plan CSV on Monday, drag two posts to swap Thursday/Friday slots, then submit the week
          for client approval.
        </Example>
        <ChromeFrame url="app.socialhyve.com/calendar">
          <div className="grid grid-cols-7 gap-px bg-neutral-200 p-px">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="aspect-square bg-white p-1">
                {i === 3 && (
                  <div className="h-full rounded-sm bg-honey-light/40 ring-1 ring-honey-dark/30" title="Scheduled post" />
                )}
              </div>
            ))}
          </div>
        </ChromeFrame>
      </>
    ),
  },
  {
    title: 'Previews',
    summary: 'Facebook & Instagram feed previews, IG grid, and future-post toggle.',
    content: (
      <>
        <p>
          Live previews show how a post will look on <strong>Facebook Feed</strong> and <strong>Instagram Feed</strong>{' '}
          — including carousel slides and truncated captions.
        </p>
        <p>
          The <strong>Instagram grid</strong> preview places your draft among recent posts so you can check visual rhythm
          before publishing.
        </p>
        <p>
          Toggle <strong>future posts</strong> in the grid preview to include scheduled content that hasn&apos;t gone live
          yet — helpful when planning aesthetics.
        </p>
        <Example>
          Before approving a product launch post, turn on future posts in the grid preview to confirm it won&apos;t clash
          with next week&apos;s promo tile.
        </Example>
        <ChromeFrame url="app.socialhyve.com/posts/new · previews">
          <div className="grid grid-cols-3 gap-0.5 p-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'aspect-square bg-neutral-200',
                  i === 4 && 'ring-2 ring-honey ring-inset bg-honey-light/50',
                )}
              />
            ))}
          </div>
        </ChromeFrame>
      </>
    ),
  },
  {
    title: 'Team & roles',
    summary: 'Org teammates vs client approvers, plus shareable review links.',
    content: (
      <>
        <p>
          <strong>Org team</strong> members (owners, editors) manage clients, compose posts, and connect integrations.
          Invite them from <strong>Team</strong>.
        </p>
        <p>
          <strong>Client approvers</strong> are scoped to a single client — they review and comment without full app
          access. Manage them under each client&apos;s Members page.
        </p>
        <p>
          Generate a <strong>review link</strong> so external approvers can sign in and work through pending posts from a
          focused portal.
        </p>
        <Example>
          Your agency editor drafts posts; the restaurant owner is a client approver who gets a review link and approves
          from their phone.
        </Example>
      </>
    ),
  },
  {
    title: 'Integrations',
    summary: 'Meta connections per client and Canva design imports.',
    content: (
      <>
        <p>
          Meta (Facebook + Instagram) is connected <strong>per client</strong> under Settings → Accounts. Re-authorize if
          tokens expire or Pages change.
        </p>
        <p>
          Canva connects separately per client under Settings → Canva. Once linked, browse designs in the composer and
          export them as post attachments.
        </p>
        <Example>
          Client A uses their own Meta Business account; Client B uses a different Page — each stays isolated with its
          own Canva workspace too.
        </Example>
      </>
    ),
  },
  {
    title: 'Account',
    summary: 'Update name, email, password, and email notification preferences.',
    content: (
      <>
        <p>
          Under <strong>Settings → Account</strong>, update your display name, change email (confirmation sent to the new
          address), or set a new password.
        </p>
        <p>
          Opt in to <strong>email notifications</strong> for workflow events — submitted for review, approved, changes
          requested, and publish failures — so you stay in the loop without checking the app constantly.
        </p>
        <Example>
          Turn on email notifications when you&apos;re the account manager so you get pinged the moment a client requests
          copy changes on a scheduled post.
        </Example>
      </>
    ),
  },
];

export function FaqContent({ className, defaultOpenIndex = 0 }) {
  return (
    <div className={cn('space-y-3', className)}>
      {FAQ_SECTIONS.map((section, index) => (
        <FaqSection
          key={section.title}
          title={section.title}
          summary={section.summary}
          defaultOpen={index === defaultOpenIndex}
        >
          {section.content}
        </FaqSection>
      ))}
    </div>
  );
}
