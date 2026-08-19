export const SITE_NAME = 'socialHyve';

export const SITE_URL = 'https://socialhyve.app';

export const DEFAULT_DESCRIPTION =
  'Draft, review, and publish Instagram and Facebook for every client — with a shared Meta pool, approval queue, and calendar in one hive.';

export const OG_IMAGE_PATH = '/og-image.png';

export const OG_IMAGE = {
  url: `${SITE_URL}${OG_IMAGE_PATH}`,
  width: 1200,
  height: 630,
  alt: 'socialHyve — schedule, review, and publish Instagram and Facebook for every client',
};

export const TWITTER_HANDLE = null;

/** Meta (Facebook) app id — public; used for fb:app_id Open Graph tag. */
export const FB_APP_ID = import.meta.env.VITE_META_APP_ID || null;

/** Public signup is disabled; new users need an invite link. */
export const INVITE_ONLY = true;

export const WAITLIST_EMAIL = 'work@hivem.nl';
