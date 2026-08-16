export const SITE_NAME = 'socialHyve';

export const DEFAULT_DESCRIPTION =
  'Draft, review, and publish Instagram and Facebook for every client — with a shared Meta pool, approval queue, and calendar in one hive.';

/** @type {Record<string, string>} */
export const PAGE_DESCRIPTIONS = {
  landing: DEFAULT_DESCRIPTION,
  faq: 'Answers about workspace Meta pool, approvals, calendar, CSV import, team roles, and client review links.',
  login: 'Sign in to your socialHyve workspace to manage clients, approvals, and scheduled posts.',
  calendar: 'View and reschedule content on the month calendar. Drag posts to new dates and spot overdue items.',
  queue: 'Review pending posts in list or grid view. Approve, request changes, or publish from the approval queue.',
  newPost: 'Create and schedule Facebook and Instagram posts with previews, platform overrides, and Canva import.',
  importPosts: 'Bulk-import scheduled posts from CSV with column mapping, preview, and import logs.',
  editPost: 'Update post content, media, schedule, and platform-specific settings.',
  postDetail: 'View post details, previews, approval status, activity, and review links.',
  clientMembers: 'Manage client team members, invites, and manager assignments.',
  clientReview: 'Review and approve pending posts for a client without full app access.',
  workspaceSettings: 'Manage workspace name, profile, clients, team, and Meta account connections.',
  workspace: 'Edit your workspace name and organization details.',
  profile: 'Update your profile, email, password, and notification preferences.',
  clients: 'Add and manage client brands in your workspace.',
  team: 'Invite teammates and manage workspace roles.',
  metaAccounts: 'Connect Facebook logins and import Pages and Instagram accounts for your workspace.',
  socialLinks: 'Assign Facebook Pages and Instagram accounts from your workspace Meta pool to each client.',
  canva: 'Connect Canva to import finished designs straight into the post composer.',
  help: 'Step-by-step guides for workspace setup, composer, approvals, calendar, integrations, and more.',
  reviewLink: 'Approve or request changes on a shared post review link.',
};

export function formatPageTitle(pageTitle) {
  return pageTitle ? `${pageTitle} | ${SITE_NAME}` : SITE_NAME;
}

export function truncateForTitle(text, max = 50) {
  if (!text) return '';
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function upsertDocumentMeta({ title, description, noIndex = false }) {
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('name', 'twitter:card', 'summary');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
}
