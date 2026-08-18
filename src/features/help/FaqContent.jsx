import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { MarketingChromeFrame } from '@/features/marketing/MarketingChromeFrame';
import { MARKETING_SCREENSHOTS } from '@/features/marketing/marketingAssets';
import {
  CalendarDemo,
  ClientsGridDemo,
  ComposerDemo,
  InteractionsDemo,
  PreviewGridDemo,
  QueueDemo,
} from '@/features/marketing/MarketingDemos';

function Example({ children }) {
  return (
    <p className="rounded-hyve-sm border border-neutral-200 bg-paper-alt px-3 py-2 text-xs text-neutral-600">
      <span className="font-semibold text-honey-dark">Example: </span>
      {children}
    </p>
  );
}

function HelpSubsection({ title, children }) {
  return (
    <section className="space-y-2 border-t border-neutral-100 pt-5 first:border-0 first:pt-0">
      <h4 className="font-display text-base font-bold text-ink">{title}</h4>
      <div className="space-y-2 text-sm leading-relaxed text-neutral-700">{children}</div>
    </section>
  );
}

function HelpSteps({ children }) {
  return <ol className="list-decimal space-y-1.5 pl-5">{children}</ol>;
}

function HelpList({ children }) {
  return <ul className="list-disc space-y-1 pl-5">{children}</ul>;
}

const FAQ_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting started',
    summary: 'First-time workspace setup from name to first approved post.',
    content: (
      <>
        <p>
          socialHyve is built for agencies and in-house teams managing multiple brands. Everything — posts,
          approvals, and integrations — is scoped to the <strong>active client</strong> you pick in the sidebar.
        </p>

        <HelpSubsection title="Recommended setup order">
          <HelpSteps>
            <li>Open <strong>Support → Settings</strong> and set your <strong>Workspace</strong> name (owners/admins).</li>
            <li>On the <strong>Clients</strong> tab, add each brand you manage and set their default timezone.</li>
            <li>On <strong>Meta Accounts</strong>, connect each Facebook login you use and import Pages into the pool.</li>
            <li>For each client, switch to them in the sidebar → <strong>Integrations → Social Links</strong> → assign pages.</li>
            <li>Optionally connect <strong>Canva</strong> per client and invite teammates on the <strong>Team</strong> tab.</li>
            <li>Click <strong>New Post</strong>, draft content, submit for review, then schedule or publish after approval.</li>
          </HelpSteps>
        </HelpSubsection>

        <HelpSubsection title="What you will see in the app">
          <HelpList>
            <li><strong>Top bar</strong> — logo, notification bell, Sign out.</li>
            <li><strong>Sidebar top</strong> — honey workspace name badge, client switcher, your email and role.</li>
            <li><strong>Sidebar nav</strong> — New Post, Content (Queue, Calendar, Import CSV), Engagement (Interactions), Integrations (Social Links, Canva), Support (Settings, Help).</li>
          </HelpList>
        </HelpSubsection>

        <HelpSubsection title="Switching clients">
          <p>
            Use the client dropdown under your workspace name. Calendar, Queue, Social Links, Canva, and new posts
            all apply to whichever client is selected. Meta connections live at the workspace level; assignments are
            per client.
          </p>
        </HelpSubsection>

        <Example>
          Agency &quot;River Studio&quot; connects two Facebook logins, assigns Café pages to River Café and retail
          pages to River Retail, then drafts a weekend promo and submits it for the café owner to approve.
        </Example>

        <MarketingChromeFrame
          url={MARKETING_SCREENSHOTS.settingsClients.url}
          screenshot={MARKETING_SCREENSHOTS.settingsClients.src}
          screenshotAlt={MARKETING_SCREENSHOTS.settingsClients.alt}
        >
          <ClientsGridDemo />
        </MarketingChromeFrame>
      </>
    ),
  },
  {
    id: 'workspace-settings',
    title: 'Workspace settings',
    summary: 'Workspace name, profile, clients, team, and Meta Accounts tabs.',
    content: (
      <>
        <p>
          Open <strong>Support → Settings</strong> to reach <strong>Workspace Settings</strong> — a tabbed page for
          org-wide configuration and your personal account.
        </p>

        <HelpSubsection title="Workspace tab (owners & admins)">
          <p>Set the name shown in the honey badge at the top of the sidebar for your whole team.</p>
          <HelpSteps>
            <li>Settings → <strong>Workspace</strong> tab.</li>
            <li>Enter a workspace name (e.g. your agency name).</li>
            <li>Click <strong>Save workspace name</strong>.</li>
          </HelpSteps>
        </HelpSubsection>

        <HelpSubsection title="Profile tab (everyone)">
          <p>Manage your personal account and notification preferences.</p>
          <HelpList>
            <li><strong>Profile</strong> — display name shown to teammates.</li>
            <li><strong>Email</strong> — change address; confirmation is sent to the new email.</li>
            <li><strong>Password</strong> — update with current password verification.</li>
            <li><strong>In-app notifications</strong> — control the bell icon: invites, review events, publish results, posts awaiting your review.</li>
            <li><strong>Email notifications</strong> — optional emails for submitted for review, approved, changes requested, and publish failed.</li>
            <li><strong>Browser push</strong> — optional alerts when the tab is in the background (enable from the bell if prompted).</li>
          </HelpList>
        </HelpSubsection>

        <HelpSubsection title="Clients tab (org team)">
          <p>Each client is a separate brand with its own calendar, social links, and approval workflow. Clients appear as a card grid with timezone, assigned pages, and an <strong>Open calendar</strong> shortcut.</p>
          <HelpSteps>
            <li>Settings → <strong>Clients</strong> → enter a name → <strong>Add client</strong>.</li>
            <li>Edit a client to change name or <strong>default timezone</strong> (used for scheduling).</li>
            <li>Click <strong>Members</strong> to invite Creatives QA, Guests, or assign org Managers.</li>
            <li>Use <strong>Open calendar</strong> on a client card to jump straight to that brand&apos;s calendar.</li>
            <li>Delete removes the client and all its posts, connections, and members (destructive).</li>
          </HelpSteps>
          <p>Owners, admins, and editors can manage clients. New clients are auto-selected in the sidebar switcher.</p>
        </HelpSubsection>

        <HelpSubsection title="Activity tab (owners & admins)">
          <p>Settings → <strong>Activity</strong> shows a durable audit log for your workspace:</p>
          <HelpList>
            <li>Post created, scheduled, published, or deleted.</li>
            <li>Team and client membership changes.</li>
            <li>Recent events with actor, timestamp, and summary text.</li>
          </HelpList>
          <p>Use Activity when you need to trace who published or removed content without digging through individual post detail pages.</p>
        </HelpSubsection>

        <HelpSubsection title="Team tab (owners & admins)">
          <p>Invite org teammates who work across clients, or add someone who already has an account.</p>
          <HelpSteps>
            <li>Settings → <strong>Team</strong> → enter email, pick role (Editor, Manager, Admin) → <strong>Invite or add</strong>.</li>
            <li>Existing users are added immediately; new users get a sign-up link (email + clipboard).</li>
            <li>Manage pending invites: copy link, resend email, or revoke.</li>
            <li>Change roles or remove members from the active list.</li>
            <li>Logged-in invitees can accept from the notification bell.</li>
          </HelpSteps>
          <p>
            <strong>Publishing workflow</strong> toggle: when &quot;Require approval before schedule or publish&quot; is
            on, posts must be approved first. Owners and admins can still override on individual posts.
          </p>
          <p>Managers must be assigned to specific clients on each client&apos;s <strong>Members</strong> page before they can work on that client&apos;s content.</p>
        </HelpSubsection>

        <HelpSubsection title="Meta Accounts tab (owners & admins)">
          <p>Connect Facebook at the workspace level. Pages import into a shared pool — not directly to clients.</p>
          <HelpSteps>
            <li>Settings → <strong>Meta Accounts</strong> → <strong>Connect Facebook account</strong>.</li>
            <li>Complete Meta OAuth and select which Pages to grant access.</li>
            <li>Repeat for additional Facebook logins if you manage pages from different accounts.</li>
            <li>Review <strong>Imported pages</strong> — each row shows platform, name, and Assigned/Unassigned status.</li>
            <li>Assign pages per client under <strong>Integrations → Social Links</strong>.</li>
          </HelpSteps>
          <p><strong>Reconnect</strong> refreshes tokens for one login. <strong>Disconnect</strong> removes that login&apos;s pages from the pool and unassigns them from all clients.</p>
        </HelpSubsection>
      </>
    ),
  },
  {
    id: 'composer',
    title: 'Composer',
    summary: 'Draft, review, schedule, publish, and fine-tune per platform.',
    content: (
      <>
        <p>
          Open <strong>New Post</strong> from the sidebar, or click a future day on the calendar to start with a
          prefilled date. The composer splits into a <strong>Content</strong> card (left) and <strong>live previews</strong> (right).
        </p>

        <HelpSubsection title="Content fields">
          <HelpList>
            <li><strong>Post name</strong> — internal title (not published).</li>
            <li><strong>Label / campaign</strong> — optional tag with presets (Campaign, Product launch, Evergreen, Promo, Event).</li>
            <li><strong>Caption</strong> — character count shows IG (2,200) or FB (63,206) limit based on selected platforms.</li>
            <li><strong>Platforms</strong> — toggle Facebook and/or Instagram chips.</li>
            <li><strong>Post to</strong> — appears when a client has multiple assigned accounts; pick which Page/account to use.</li>
            <li><strong>Schedule</strong> — datetime + timezone (minimum 10 minutes from now for scheduling).</li>
            <li><strong>Media</strong> — upload images/video or import from Canva via the design picker icon.</li>
          </HelpList>
          <p>Optimization tips appear under the caption when relevant (e.g. missing media for Instagram).</p>
        </HelpSubsection>

        <HelpSubsection title="Save draft">
          <p>Saves the post as a draft without submitting for approval. You can return via post detail or Queue → All active.</p>
        </HelpSubsection>

        <HelpSubsection title="Submit for review">
          <HelpSteps>
            <li>Complete caption and media (Instagram requires at least one image or video).</li>
            <li>Click <strong>Submit for review</strong>.</li>
            <li>Post moves to Queue → <strong>Needs review</strong> with status Pending review.</li>
            <li>Approvers receive in-app (and optional email) notifications.</li>
          </HelpSteps>
          <p>After resubmitting from Changes requested, the post returns to Needs review.</p>
        </HelpSubsection>

        <HelpSubsection title="Schedule">
          <p>Sets the post to scheduled status and creates a publish job for the chosen time.</p>
          <HelpSteps>
            <li>Set a schedule datetime at least 10 minutes in the future.</li>
            <li>Ensure the post is <strong>Approved</strong> (or your org has approval disabled, or you are owner/admin).</li>
            <li>Click <strong>Schedule</strong> — you are redirected to the Calendar.</li>
          </HelpSteps>
          <p>If approval is required and the post is not approved, Schedule is blocked with a hint in the action bar.</p>
        </HelpSubsection>

        <HelpSubsection title="Publish now">
          <p>Immediately publishes to selected platforms after upload completes.</p>
          <HelpSteps>
            <li>Same approval and validation rules as Schedule.</li>
            <li>Progress panel shows upload stages, then platform publish status.</li>
            <li>On success, you land on post detail with Published status.</li>
          </HelpSteps>
        </HelpSubsection>

        <HelpSubsection title="Fine tune (per-platform overrides)">
          <p>
            Expand the optional <strong>Fine tune</strong> card below the action bar when Facebook and/or Instagram is
            enabled. Use it when one post needs different captions, schedules, placements, or platform-specific extras.
          </p>
          <p className="mt-4 text-sm font-semibold text-ink">Placements &amp; publish mode</p>
          <HelpList>
            <li><strong>Facebook</strong> — Feed, Carousel, Reels, or Stories placement.</li>
            <li><strong>Instagram</strong> — Feed, Reels, or Stories placement.</li>
            <li><strong>Publish mode</strong> — choose whether the platform uses the main post schedule or its own override time.</li>
          </HelpList>
          <p className="mt-4 text-sm font-semibold text-ink">Facebook overrides</p>
          <HelpList>
            <li><strong>Caption override</strong> — different FB copy from the main caption.</li>
            <li><strong>Caption toolbar</strong> — emoji, hashtag, variables (<code className="text-xs">{'{client_name}'}</code>, <code className="text-xs">{'{post_label}'}</code>), and link insert.</li>
            <li><strong>Shorten URLs</strong> — rewrites links to <code className="text-xs">https://socialhyve.app/s/…</code> when publishing to Facebook (see URL shortener below).</li>
            <li><strong>Schedule override</strong> — publish FB at a different time than the main schedule.</li>
            <li><strong>Carousel link</strong> — destination URL when Carousel placement is selected.</li>
            <li><strong>Media overrides</strong> — swap or reorder media for Facebook only.</li>
          </HelpList>
          <p className="mt-4 text-sm font-semibold text-ink">Instagram overrides</p>
          <HelpList>
            <li><strong>Caption override</strong> — different IG copy from the main caption.</li>
            <li><strong>Schedule override</strong> — publish IG at a different time.</li>
            <li><strong>First comment</strong> — auto-posted after publish (great for hashtags).</li>
            <li><strong>Location</strong> — search and tag an Instagram location on the post.</li>
            <li><strong>Collaborators</strong> — tag Instagram collaborator accounts.</li>
            <li><strong>AI Generated</strong> — mark content as AI-generated when required by Meta.</li>
            <li><strong>Media overrides</strong> — swap or reorder media for Instagram only.</li>
          </HelpList>
          <Example>
            One caption for both platforms, but Fine tune schedules Instagram 30 minutes after Facebook with a shorter IG
            caption, a first comment with hashtags, and Shorten URLs enabled for the Facebook link.
          </Example>
        </HelpSubsection>

        <HelpSubsection title="URL shortener">
          <p>
            When <strong>Shorten URLs</strong> is enabled in Fine tune for Facebook, long links in the FB caption are
            replaced with tracked short links at publish time:
          </p>
          <HelpList>
            <li>Format: <code className="text-xs">https://socialhyve.app/s/{'{slug}'}</code></li>
            <li>Created automatically when you publish — no manual copy/paste.</li>
            <li>Short links redirect to the original destination URL.</li>
            <li>Use the caption toolbar checkbox or enable before publishing from Fine tune.</li>
          </HelpList>
          <p>Instagram captions do not use the shortener today — FB only.</p>
        </HelpSubsection>

        <HelpSubsection title="Editing & published posts">
          <p>Edit existing drafts from post detail or Queue. Published posts cannot be edited in the composer — create a new post instead.</p>
        </HelpSubsection>

        <MarketingChromeFrame
          url={MARKETING_SCREENSHOTS.composer.url}
          screenshot={MARKETING_SCREENSHOTS.composer.src}
          screenshotAlt={MARKETING_SCREENSHOTS.composer.alt}
        >
          <ComposerDemo />
        </MarketingChromeFrame>
      </>
    ),
  },
  {
    id: 'approval-queue',
    title: 'Approval queue',
    summary: 'Review tabs, urgency badges, approve, request changes, and publish.',
    content: (
      <>
        <p>
          <strong>Content → Queue</strong> is where Creatives QA and org team review posts before they go live.
        </p>

        <HelpSubsection title="Tabs">
          <HelpList>
            <li><strong>Needs review</strong> — Pending review and Changes requested (not yet published).</li>
            <li><strong>Approved</strong> — Approved posts still in draft or scheduled status, ready to schedule/publish.</li>
            <li><strong>All active</strong> — Every non-published post regardless of approval state.</li>
            <li><strong>Published</strong> — Archive of posts that have gone live; useful for checking recent publish history.</li>
          </HelpList>
        </HelpSubsection>

        <HelpSubsection title="Grid layout">
          <p>The queue shows posts as a visual grid with large thumbnails, status badges, and schedule urgency on each card.</p>
        </HelpSubsection>

        <HelpSubsection title="Schedule urgency">
          <p>Posts with a schedule time show colored borders and badges:</p>
          <HelpList>
            <li><strong>Past due</strong> (red) — scheduled time has passed.</li>
            <li><strong>&lt;2 days</strong> (red) — less than two days until schedule.</li>
            <li><strong>&lt;5 days</strong> (amber) — less than five days.</li>
            <li><strong>Nd</strong> (green) — five or more days remaining.</li>
          </HelpList>
          <p>
            <strong>Important:</strong> Pending posts do <em>not</em> auto-publish when overdue. Approve first, then
            schedule or publish. Urgency is a visual reminder only.
          </p>
        </HelpSubsection>

        <HelpSubsection title="Actions on each post">
          <HelpList>
            <li><strong>Approve</strong> (green check) — moves approval status to Approved.</li>
            <li><strong>Request changes</strong> (red X) — requires feedback text; sets Changes requested and notifies the author.</li>
            <li><strong>Publish now</strong> — on Approved tab for draft posts (org team only, not Creatives QA).</li>
            <li><strong>Edit</strong> — opens the composer to update or schedule the post.</li>
            <li><strong>Click card</strong> — opens post detail.</li>
          </HelpList>
          <p>On <strong>Needs review</strong>, select multiple posts with the checkboxes and use <strong>Approve selected</strong> for bulk approval.</p>
        </HelpSubsection>

        <HelpSubsection title="Search">
          <p>Filter by caption, internal post name, or label/campaign tag.</p>
        </HelpSubsection>

        <Example>
          A post scheduled for 4 PM today sits in Needs review with a red Past due badge. The client approves from
          their review link; your editor then schedules it for the next available slot.
        </Example>

        <MarketingChromeFrame
          url={MARKETING_SCREENSHOTS.queue.url}
          screenshot={MARKETING_SCREENSHOTS.queue.src}
          screenshotAlt={MARKETING_SCREENSHOTS.queue.alt}
        >
          <QueueDemo />
        </MarketingChromeFrame>
      </>
    ),
  },
  {
    id: 'calendar',
    title: 'Calendar',
    summary: 'Month and week views, drag reschedule, urgency, and planning.',
    content: (
      <>
        <p>
          <strong>Content → Calendar</strong> shows when content is planned and what has published. The app opens here
          by default after login.
        </p>

        <HelpSubsection title="Month view">
          <p>Traditional Mon–Sun grid. Each day shows post cards with thumbnail, time, status badge, and urgency badge. Use arrows to change months.</p>
          <p>Use the <strong>+</strong> button on a day (today or future) to start a new post with that date prefilled.</p>
        </HelpSubsection>

        <HelpSubsection title="Week view">
          <p>Seven columns (Mon–Sun) for the current week with taller day cells so more posts fit. Use prev/next arrows to move by week. Same drag-and-drop, + button, and post cards as month view.</p>
        </HelpSubsection>

        <HelpSubsection title="Drag to reschedule">
          <HelpSteps>
            <li>In month or week view, drag a post card onto another day.</li>
            <li>The post keeps its time-of-day but moves to the new date (in the post&apos;s timezone).</li>
            <li>Published and publishing posts cannot be dragged.</li>
            <li>Past dates are blocked — you cannot drop onto yesterday or earlier.</li>
          </HelpSteps>
          <p>Valid drop targets highlight in honey. Errors show as toasts (e.g. &quot;Pick today or a future date&quot;).</p>
        </HelpSubsection>

        <HelpSubsection title="Urgency on calendar">
          <p>Same Past due / countdown badges as the Queue appear on calendar cards so you can spot overdue content while planning.</p>
        </HelpSubsection>

        <HelpSubsection title="Header actions (org team)">
          <HelpList>
            <li><strong>Import CSV</strong> — bulk-create draft posts (see CSV Import section).</li>
            <li><strong>New Post</strong> — open the composer.</li>
          </HelpList>
          <p>Guest client members see a read-only calendar (no drag, no new post buttons). Creatives QA can drag to reschedule and open approved posts to schedule, but cannot create new posts or import CSV.</p>
        </HelpSubsection>

        <MarketingChromeFrame
          url={MARKETING_SCREENSHOTS.calendar.url}
          screenshot={MARKETING_SCREENSHOTS.calendar.src}
          screenshotAlt={MARKETING_SCREENSHOTS.calendar.alt}
        >
          <CalendarDemo />
        </MarketingChromeFrame>
      </>
    ),
  },
  {
    id: 'csv-import',
    title: 'CSV import',
    summary: 'Bulk-create draft posts from a spreadsheet.',
    content: (
      <>
        <p>
          Plan weeks of content in a spreadsheet, then import drafts in one step. Open via <strong>Content → Import CSV</strong> or the Calendar header button.
        </p>

        <HelpSubsection title="Before you import">
          <HelpList>
            <li>Select the correct <strong>client</strong> in the sidebar first — imports are scoped to the active client.</li>
            <li>Download the <strong>post template</strong> from the import page (optional timezone reference file too).</li>
            <li>Maximum 200 rows per upload.</li>
          </HelpList>
        </HelpSubsection>

        <HelpSubsection title="Template columns">
          <HelpList>
            <li><strong>internal_name</strong>, <strong>caption</strong>, <strong>label</strong> — post metadata.</li>
            <li><strong>publish_facebook</strong>, <strong>publish_instagram</strong> — true/false toggles.</li>
            <li><strong>scheduled_date</strong> + <strong>scheduled_time</strong> + <strong>schedule_timezone</strong> — planned publish time.</li>
          </HelpList>
          <p>Imported posts are created as <strong>drafts</strong>. Media must be added in the composer afterward.</p>
        </HelpSubsection>

        <HelpSubsection title="Import flow">
          <HelpSteps>
            <li>Upload CSV (drag-drop or file picker).</li>
            <li>Review the preview table — each row shows Ready or error reasons.</li>
            <li>Click <strong>Import N posts</strong> and wait for the progress bar.</li>
            <li>Use <strong>View calendar</strong> or <strong>View queue</strong> to review imported drafts.</li>
          </HelpSteps>
          <p>Import history is logged per client and can be cleared from the import page.</p>
        </HelpSubsection>

        <Example>
          Import a 30-day content plan on Monday, open Calendar to spot gaps, drag two posts to swap days, then submit the week for client approval.
        </Example>
      </>
    ),
  },
  {
    id: 'previews',
    title: 'Previews',
    summary: 'Facebook feed, Instagram feed, grid, and Reels previews.',
    content: (
      <>
        <p>
          Live previews appear in the composer (right column), post detail, client review portal, and shareable review links.
        </p>

        <HelpSubsection title="Platform tabs">
          <p>When both Facebook and Instagram are enabled, switch between FB and IG preview tabs. Each reflects platform-specific caption overrides from Fine tune.</p>
        </HelpSubsection>

        <HelpSubsection title="Facebook Feed preview">
          <HelpList>
            <li>Page avatar and name from the selected Facebook account.</li>
            <li>Caption text with carousel support for multiple images/videos.</li>
            <li>Scheduled time label when a schedule is set.</li>
          </HelpList>
        </HelpSubsection>

        <HelpSubsection title="Instagram Feed preview">
          <p>Feed-style single-post layout with caption, media carousel, and account avatar from the selected IG account.</p>
        </HelpSubsection>

        <HelpSubsection title="Instagram grid preview">
          <HelpSteps>
            <li>Switch to grid mode in the Instagram preview toolbar.</li>
            <li>Your draft appears highlighted with a honey ring among recent and scheduled posts.</li>
            <li>Toggle <strong>Show future posts</strong> to include scheduled content not yet live — useful for checking visual rhythm.</li>
          </HelpSteps>
          <p>Draft and Scheduled badges appear on grid cells. Switch preview modes with the toolbar — Feed, Grid, and Reels each reflect placement-aware layouts.</p>
        </HelpSubsection>

        <HelpSubsection title="Instagram Reels preview">
          <p>Vertical 9:16 preview for video content when Reels placement or preview mode is selected in the toolbar.</p>
        </HelpSubsection>

        <MarketingChromeFrame
          url={MARKETING_SCREENSHOTS.previewGrid.url}
          screenshot={MARKETING_SCREENSHOTS.previewGrid.src}
          screenshotAlt={MARKETING_SCREENSHOTS.previewGrid.alt}
        >
          <PreviewGridDemo />
        </MarketingChromeFrame>
      </>
    ),
  },
  {
    id: 'team-roles',
    title: 'Team & roles',
    summary: 'Org teammates, client roles, review portal, and review links.',
    content: (
      <>
        <p>
          socialHyve separates <strong>org team</strong> members (who work across clients) from <strong>client members</strong> (scoped to one brand).
        </p>

        <HelpSubsection title="Org team roles (Settings → Team)">
          <HelpList>
            <li><strong>Owner / Admin</strong> — full workspace settings, Meta connect, team management, can bypass approval.</li>
            <li><strong>Editor</strong> — create clients, compose and schedule posts, manage integrations.</li>
            <li><strong>Manager</strong> — must be assigned per client on Members page; then works like editor for that client.</li>
          </HelpList>
        </HelpSubsection>

        <HelpSubsection title="Client member roles (Clients → Members)">
          <HelpSteps>
            <li>Settings → Clients → <strong>Members</strong> for the client.</li>
            <li>Invite by email with role <strong>Creatives QA</strong> or <strong>Guest</strong>.</li>
            <li>Assign org <strong>Managers</strong> to this client (owners/admins only).</li>
          </HelpSteps>
          <HelpList>
            <li><strong>Creatives QA</strong> — Queue, Review portal, Calendar, post detail; can Approve or Require edits, schedule approved posts, and Publish now from the edit composer.</li>
            <li><strong>Guest</strong> — read-only Calendar and post detail; no Queue access.</li>
          </HelpList>
          <p>Client-only users see a reduced sidebar: Creative QA review links, Queue (Creatives QA), Calendar, Settings, Help.</p>
        </HelpSubsection>

        <HelpSubsection title="Client Review portal (logged-in Creatives QA)">
          <p><strong>Creative QA → [Client name]</strong> in the sidebar opens a focused review UI with two tabs:</p>
          <HelpList>
            <li><strong>Approval for content</strong> — preview posts, add feedback, Approve content or Require edits.</li>
            <li><strong>Scheduling for publishing</strong> — approved posts not yet queued; pick a date/time and queue them for publishing. Already scheduled posts do not appear here.</li>
          </HelpList>
          <p>On post detail, Creatives QA can also change publish state and schedule from the Status &amp; scheduling card.</p>
        </HelpSubsection>

        <HelpSubsection title="Shareable review link (external, no account)">
          <HelpSteps>
            <li>On post detail, click the <strong>Copy review link</strong> icon.</li>
            <li>Share the URL (expires after 7 days).</li>
            <li>External reviewer sees previews, can Approve or Require edits (comment required for edits).</li>
          </HelpSteps>
          <p>Review links are per-post tokens at <code className="text-xs">/review/…</code> — separate from client member invites.</p>
        </HelpSubsection>

        <Example>
          Agency editor drafts posts; restaurant owner is Creatives QA with a review link — they approve from their phone without learning the full app.
        </Example>
      </>
    ),
  },
  {
    id: 'interactions',
    title: 'Interactions',
    summary: 'Facebook and Instagram comments and DMs in one inbox.',
    content: (
      <>
        <p>
          <strong>Engagement → Interactions</strong> syncs post comments and direct messages from assigned Meta accounts.
          Reply, assign teammates, archive threads, and jump to the related socialHyve post when a comment matches a published target.
        </p>

        <HelpSubsection title="Setup and permissions">
          <HelpSteps>
            <li>Assign Facebook Pages and Instagram accounts under <strong>Integrations → Social Links</strong>.</li>
            <li>Open <strong>Settings → Meta Accounts</strong> and reconnect if prompted — Interactions needs comment and messaging permissions.</li>
            <li>Visit <strong>Interactions</strong> — the inbox syncs the last 30 days on load. Use <strong>Sync now</strong> to refresh.</li>
          </HelpSteps>
          <p>
            In Meta App Review, messaging scopes may require approval before non-admin users can use DMs in production.
            Dev mode works for app admins and test users first.
          </p>
          <p>
            <strong>Facebook Messenger</strong> uses the <code className="text-xs">pages_messaging</code> permission, which
            is not requestable via OAuth <code className="text-xs">scope=</code>. Add the <strong>Messenger</strong> product
            in your Meta app, include <code className="text-xs">pages_messaging</code> in your Login for Business
            configuration (<code className="text-xs">META_CONFIG_ID</code>), then reconnect.
          </p>
        </HelpSubsection>

        <HelpSubsection title="Inbox layout">
          <HelpList>
            <li><strong>Left pane</strong> — search, platform/type/status filters, thread list with unread dot.</li>
            <li><strong>Right pane</strong> — message history, assignee, Mark read/unread, Like (Facebook comments only), Archive.</li>
            <li><strong>Composer</strong> — text reply with quick emoji insert; ⌘/Ctrl+Enter to send.</li>
          </HelpList>
        </HelpSubsection>

        <HelpSubsection title="Comments vs DMs">
          <p>
            <strong>Comments</strong> appear on published Facebook posts and Instagram media. When the external post ID matches a
            socialHyve publish target, the thread header links to that post.
          </p>
          <p>
            <strong>DMs</strong> include Facebook Messenger and Instagram direct messages for assigned pages.
            Composer emojis are sent as message text — native tapback reactions are not supported via API.
          </p>
        </HelpSubsection>

        <MarketingChromeFrame
          url={MARKETING_SCREENSHOTS.interactions.url}
          screenshot={MARKETING_SCREENSHOTS.interactions.src}
          screenshotAlt={MARKETING_SCREENSHOTS.interactions.alt}
        >
          <InteractionsDemo />
        </MarketingChromeFrame>

        <Example>
          A café post goes live on Instagram; a customer comment appears in Interactions within minutes after sync.
          Your community manager replies from socialHyve and assigns the thread to a teammate for follow-up.
        </Example>
      </>
    ),
  },
  {
    id: 'integrations',
    title: 'Integrations',
    summary: 'Meta pool, Social Links, and Canva — setup and daily use.',
    content: (
      <>
        <p>
          Integrations use a two-step model: connect at the <strong>workspace</strong> level, assign at the <strong>client</strong> level.
        </p>

        <HelpSubsection title="Meta Accounts — workspace pool">
          <HelpSteps>
            <li>Settings → Meta Accounts → Connect Facebook account.</li>
            <li>Grant Page access in Meta&apos;s dialog — imported FB Pages and linked IG accounts appear in the pool.</li>
            <li>Connect additional Facebook logins if needed (each login is a separate session).</li>
            <li>Imported pages list shows platform chip, name/handle, and Assigned vs Unassigned badge.</li>
          </HelpSteps>
          <p>Reconnect one login if tokens expire or if the Interactions banner asks for updated permissions (comments + messaging). Disconnect removes that login&apos;s pages and unassigns them everywhere.</p>
        </HelpSubsection>

        <HelpSubsection title="Social Links — per-client assignment">
          <p><strong>Integrations → Social Links</strong> (scoped to active client in sidebar).</p>
          <HelpSteps>
            <li><strong>Assign from pool</strong> — modal with checkboxes for unassigned pages only.</li>
            <li><strong>Choose defaults</strong> — set primary FB and IG accounts (setting FB default can auto-link matching IG).</li>
            <li><strong>Set default</strong> per row — primary account used when composer doesn&apos;t specify one.</li>
            <li><strong>Unassign</strong> / <strong>Unassign all</strong> — returns pages to the pool without disconnecting Meta.</li>
          </HelpSteps>
          <p>Each page can belong to only one client. Assigned rows show profile photo, platform chip, name, and Default badge.</p>
        </HelpSubsection>

        <HelpSubsection title="Canva — per client">
          <HelpSteps>
            <li>Select client in sidebar → <strong>Integrations → Canva</strong>.</li>
            <li>Click <strong>Connect Canva</strong> and complete OAuth.</li>
            <li>In the composer media section, open the Canva picker → browse/search designs → import.</li>
          </HelpSteps>
          <p>Canva imports appear in the media strip as design-sourced items. Disconnect from Canva settings when needed.</p>
        </HelpSubsection>

        <Example>
          Connect personal Facebook for Client A and a business login for Client B — both pools share one workspace import list, assigned separately with no cross-client token bleed.
        </Example>
      </>
    ),
  },
  {
    id: 'notifications',
    title: 'Notifications',
    summary: 'Bell icon, in-app alerts, email, and push preferences.',
    content: (
      <>
        <p>
          Stay on top of reviews and publish results without refreshing the Queue.
        </p>

        <HelpSubsection title="Notification bell (top bar)">
          <HelpList>
            <li>Unread count badge on the bell icon.</li>
            <li>Panel lists recent notifications with title, body, and relative time.</li>
            <li>Unread rows have an amber background and dot.</li>
            <li>Click a row to jump to the related post, queue, or invite.</li>
            <li><strong>Mark all read</strong> clears unread state.</li>
          </HelpList>
          <p>Client and org invites show inline Accept / Decline actions when you&apos;re logged in with the invited email.</p>
        </HelpSubsection>

        <HelpSubsection title="Invite links not working?">
          <ul className="list-disc space-y-1 pl-5">
            <li>Team invites use <code className="text-xs">/app/login?invite=…</code>; client invites use <code className="text-xs">?clientInvite=…</code>.</li>
            <li>Links expire after 7 days — ask an admin to resend or use <strong>Invite or add</strong> again.</li>
            <li>If email link fails but copied link works, confirm production links use <code className="text-xs">https://socialhyve.app</code> (admin: <strong>APP_URL</strong> server setting).</li>
            <li>After sign-up with email confirmation on, sign in again — the invite completes automatically.</li>
          </ul>
        </HelpSubsection>

        <HelpSubsection title="What triggers notifications">
          <HelpList>
            <li>Post submitted for review → approvers.</li>
            <li>Post approved or changes requested → post authors.</li>
            <li>Publish failed → authors (via backend).</li>
            <li>Client or team invitations.</li>
            <li>Posts awaiting your review (Creatives QA).</li>
          </HelpList>
        </HelpSubsection>

        <HelpSubsection title="Configure preferences">
          <p>Settings → Profile tab:</p>
          <HelpList>
            <li><strong>In-app notifications</strong> — master toggle plus per-event checkboxes (invites, review events, publish results, review needed).</li>
            <li><strong>Email notifications</strong> — optional emails for workflow events.</li>
            <li><strong>Browser push</strong> — enable when prompted from the bell for background alerts.</li>
          </HelpList>
          <p>If in-app notifications are disabled, the bell panel links you to Settings to turn them back on.</p>
        </HelpSubsection>

        <HelpSubsection title="Live updates">
          <p>Queue and Calendar auto-refresh when post status changes (e.g. publishing → published) and may show brief status toasts.</p>
        </HelpSubsection>
      </>
    ),
  },
];

export function FaqContent({ className, defaultSectionIndex = 0 }) {
  const getIndexForHash = () => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return defaultSectionIndex;
    const index = FAQ_SECTIONS.findIndex((item) => item.id === hash);
    return index >= 0 ? index : defaultSectionIndex;
  };

  const [activeIndex, setActiveIndex] = useState(getIndexForHash);
  const section = FAQ_SECTIONS[activeIndex] ?? FAQ_SECTIONS[0];

  useEffect(() => {
    const syncFromHash = () => setActiveIndex(getIndexForHash());
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [defaultSectionIndex]);

  const selectSection = (index) => {
    setActiveIndex(index);
    const id = FAQ_SECTIONS[index]?.id;
    if (id) {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6 lg:flex-row lg:items-start', className)}>
      <nav
        aria-label="Help topics"
        className="shrink-0 space-y-1 lg:sticky lg:top-8 lg:w-56 xl:w-64"
      >
        {FAQ_SECTIONS.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectSection(index)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'w-full rounded-hyve-sm px-3 py-2.5 text-left transition-colors',
                isActive
                  ? 'bg-honey text-white shadow-hyve-sm'
                  : 'text-neutral-700 hover:bg-neutral-100',
              )}
            >
              <span className="block text-sm font-semibold">{item.title}</span>
              <span
                className={cn(
                  'mt-0.5 block text-xs leading-snug',
                  isActive ? 'text-white/85' : 'text-muted-foreground',
                )}
              >
                {item.summary}
              </span>
            </button>
          );
        })}
      </nav>

      <article
        id={section.id}
        className="min-w-0 flex-1 scroll-mt-24 rounded-hyve-lg border border-neutral-200 bg-white p-6 shadow-hyve-sm lg:p-8"
      >
        <h3 className="font-display text-xl font-bold text-ink">{section.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>
        <div className="mt-6 space-y-1">{section.content}</div>
      </article>
    </div>
  );
}
