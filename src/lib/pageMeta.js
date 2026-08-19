import {
  DEFAULT_DESCRIPTION,
  FB_APP_ID,
  OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  TWITTER_HANDLE,
} from './siteConfig';

export { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, OG_IMAGE };

/** @type {Record<string, string>} */
export const PAGE_DESCRIPTIONS = {
  landing:
    'Draft, review, and publish Instagram and Facebook for every client — Fine-Tune overrides, approval queue, calendar, Interactions inbox, and URL shortener in one hive.',
  faq: 'Answers about workspace Meta pool, Fine-Tune, approvals, calendar, Interactions, URL shortener, team roles, and client review links.',
  pricing: 'Starter and Pro plans for socialHyve — schedule, approve, and publish Instagram and Facebook for every client.',
  privacy: 'How socialHyve collects, uses, and protects your data.',
  terms: 'Terms of Service for using socialHyve, including subscriptions billed through Creem.',
  acceptableUse: 'Acceptable use rules for socialHyve workspaces and connected social accounts.',
  waitlist:
    'socialHyve is invite-only during early access. Join the waitlist and we will email you when a spot opens up.',
  login: 'Sign in to your socialHyve workspace to manage clients, approvals, and scheduled posts.',
  calendar: 'View and reschedule content on the month or week calendar. Drag posts to new dates and spot overdue items.',
  interactions: 'Reply to Facebook and Instagram comments and DMs in one inbox. Sync, assign, archive, and link threads to posts.',
  queue: 'Review pending posts in a visual grid. Approve, request changes, or publish from the approval queue.',
  newPost: 'Create and schedule Facebook and Instagram posts with previews, platform overrides, and Canva import.',
  importPosts: 'Bulk-import scheduled posts from CSV with column mapping, preview, and import logs.',
  editPost: 'Update post content, media, schedule, and platform-specific settings.',
  postDetail: 'View post details, previews, approval status, activity, and review links.',
  clientMembers: 'Manage client team members, invites, and manager assignments.',
  clientReview: 'Review and approve pending posts for a client without full app access.',
  workspaceSettings: 'Manage workspace name, profile, clients, team, and Meta account connections.',
  workspace: 'Edit your workspace name, language, region, and timezone defaults.',
  profile: 'Update your profile, email, password, and notification preferences.',
  clients: 'Add and manage client brands in your workspace.',
  team: 'Invite teammates and manage workspace roles.',
  activity: 'Review workspace activity including post deletes, publishes, and team changes.',
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

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function resolvePageUrl(pathname = '/') {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

export function upsertDocumentMeta({
  title,
  description,
  noIndex = false,
  url,
  image = OG_IMAGE.url,
  imageAlt = OG_IMAGE.alt,
  imageWidth = OG_IMAGE.width,
  imageHeight = OG_IMAGE.height,
}) {
  const pageUrl = url || (typeof window !== 'undefined'
    ? resolvePageUrl(window.location.pathname)
    : SITE_URL);

  document.title = title;
  upsertLink('canonical', pageUrl);

  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:url', pageUrl);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:image:secure_url', image);
  upsertMeta('property', 'og:image:width', String(imageWidth));
  upsertMeta('property', 'og:image:height', String(imageHeight));
  upsertMeta('property', 'og:image:alt', imageAlt);
  upsertMeta('property', 'og:locale', 'en_US');
  if (FB_APP_ID) {
    upsertMeta('property', 'fb:app_id', FB_APP_ID);
  }

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);
  upsertMeta('name', 'twitter:image:alt', imageAlt);
  if (TWITTER_HANDLE) {
    upsertMeta('name', 'twitter:site', TWITTER_HANDLE);
    upsertMeta('name', 'twitter:creator', TWITTER_HANDLE);
  }
}
