import { isVideo } from './previews/mediaUtils.js';

export const IG_CAPTION_LIMIT = 2200;
export const FB_CAPTION_LIMIT = 63206;

export const PLACEMENTS = {
  facebook: ['feed', 'reels', 'stories', 'carousel'],
  instagram: ['feed', 'reels', 'stories'],
};

export const PLACEMENT_LABELS = {
  feed: 'Feed',
  reels: 'Reels',
  stories: 'Stories',
  carousel: 'Carousel',
};

export const PUBLISH_MODES = ['automatic', 'manual'];

const DEFAULT_PLATFORM = {
  caption: '',
  scheduled_at: '',
  placement: 'feed',
  publish_mode: 'automatic',
};

export const DEFAULT_FACEBOOK_OVERRIDE = {
  ...DEFAULT_PLATFORM,
  carousel_link: '',
  shorten_urls: false,
};

export const DEFAULT_INSTAGRAM_OVERRIDE = {
  ...DEFAULT_PLATFORM,
  location_id: '',
  location_name: '',
  collaborators: [],
  ai_generated: false,
};

function normalizeCollaborators(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).replace(/^@/, '').trim().toLowerCase()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.replace(/^@/, '').trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

export function normalizePlatformOverrides(overrides = {}) {
  const instagram = { ...DEFAULT_INSTAGRAM_OVERRIDE, ...(overrides.instagram || {}) };
  return {
    facebook: { ...DEFAULT_FACEBOOK_OVERRIDE, ...(overrides.facebook || {}) },
    instagram: {
      ...instagram,
      collaborators: normalizeCollaborators(instagram.collaborators),
    },
  };
}

export function getPlatformPlacement(overrides, platform) {
  const placement = overrides?.[platform]?.placement || 'feed';
  if (PLACEMENTS[platform]?.includes(placement)) return placement;
  return 'feed';
}

export function getPublishMode(overrides, platform) {
  const mode = overrides?.[platform]?.publish_mode || 'automatic';
  return mode === 'manual' ? 'manual' : 'automatic';
}

export function getEffectiveCaption(postCaption, overrides, platform) {
  const override = overrides?.[platform]?.caption;
  if (override != null && String(override).trim() !== '') return override;
  return postCaption || '';
}

export function getInstagramLocationName(overrides = {}) {
  return overrides?.instagram?.location_name || overrides?.instagram?.location || '';
}

export function hasFineTuneOverrides(overrides = {}, { publishFacebook, publishInstagram } = {}) {
  const normalized = normalizePlatformOverrides(overrides);
  const platforms = [];
  if (publishFacebook) platforms.push('facebook');
  if (publishInstagram) platforms.push('instagram');

  return platforms.some((platform) => {
    const data = normalized[platform];
    const defaults = platform === 'facebook' ? DEFAULT_FACEBOOK_OVERRIDE : DEFAULT_INSTAGRAM_OVERRIDE;
    return Object.keys(defaults).some((key) => {
      const value = data[key];
      const defaultValue = defaults[key];
      if (value == null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'boolean') return value !== defaultValue;
      return value !== defaultValue;
    });
  });
}

export function getFineTuneSummary(overrides = {}, { publishFacebook, publishInstagram } = {}) {
  if (!hasFineTuneOverrides(overrides, { publishFacebook, publishInstagram })) {
    return 'Using platform defaults';
  }
  const parts = [];
  if (publishFacebook) {
    const placement = getPlatformPlacement(overrides, 'facebook');
    parts.push(`FB ${PLACEMENT_LABELS[placement] || placement}`);
  }
  if (publishInstagram) {
    const placement = getPlatformPlacement(overrides, 'instagram');
    parts.push(`IG ${PLACEMENT_LABELS[placement] || placement}`);
  }
  return parts.join(' · ');
}

function pushTip(list, severity, message) {
  list.push({ severity, message });
}

export function validateFineTune({
  caption,
  media = [],
  platformOverrides = {},
  publishFacebook = true,
  publishInstagram = true,
  scheduledAt,
  firstComment = '',
  requireInstagramMedia = true,
}) {
  const overrides = normalizePlatformOverrides(platformOverrides);
  const errors = [];
  const warnings = [];
  const tips = [];
  const platformStatus = {};

  const hasVideo = media.some((m) => isVideo(m.mime_type));
  const mediaCount = media.length;

  const validatePlatform = (platform, enabled) => {
    if (!enabled) {
      platformStatus[platform] = { complete: true, errors: [], warnings: [] };
      return;
    }

    const data = overrides[platform];
    const placement = getPlatformPlacement(overrides, platform);
    const publishMode = getPublishMode(overrides, platform);
    const effectiveCaption = getEffectiveCaption(caption, overrides, platform);
    const platformErrors = [];
    const platformWarnings = [];

    const limit = platform === 'instagram' ? IG_CAPTION_LIMIT : FB_CAPTION_LIMIT;
    if (effectiveCaption.length > limit) {
      platformErrors.push(`${platform === 'instagram' ? 'Instagram' : 'Facebook'} caption exceeds ${limit} characters.`);
    } else if (platform === 'instagram' && effectiveCaption.length > IG_CAPTION_LIMIT * 0.9) {
      pushTip(tips, 'warn', 'Caption is nearing Instagram\'s 2,200 character limit.');
    }

    if (placement === 'reels' && !hasVideo) {
      platformErrors.push(`${platform === 'instagram' ? 'Instagram' : 'Facebook'} Reels requires a video.`);
    }

    if (placement === 'stories' && mediaCount > 1 && publishMode === 'automatic') {
      platformWarnings.push('Multiple media in Stories requires manual publish.');
    }

    if (platform === 'facebook' && placement === 'carousel' && mediaCount > 1 && !data.carousel_link?.trim()) {
      platformErrors.push('Facebook carousel requires a destination link URL.');
    }

    if (requireInstagramMedia && platform === 'instagram' && mediaCount === 0) {
      platformErrors.push('Instagram requires at least one image or video.');
    }

    if (platform === 'instagram') {
      if ((data.location_name || data.location) && !data.location_id) {
        platformWarnings.push('Select a location from search results before publishing.');
      }
      for (const username of data.collaborators || []) {
        if (!/^[a-z0-9._]+$/.test(username)) {
          platformWarnings.push(`Collaborator "${username}" looks invalid.`);
        }
      }
    }

    if (publishMode === 'automatic' && (placement === 'reels' || placement === 'stories')) {
      platformWarnings.push(`${PLACEMENT_LABELS[placement]} automatic publishing is not supported yet — use Manual or Feed.`);
    }

    if (effectiveCaption.length > 0 && !effectiveCaption.includes('#')) {
      pushTip(tips, 'warn', `Consider adding hashtags to improve ${platform === 'instagram' ? 'Instagram' : 'Facebook'} discoverability.`);
    }

    if (platform === 'instagram' && firstComment.length > 2200) {
      platformWarnings.push('First comment exceeds Instagram\'s comment limit.');
    }

    platformStatus[platform] = {
      complete: platformErrors.length === 0,
      errors: platformErrors,
      warnings: platformWarnings,
    };
    errors.push(...platformErrors);
    warnings.push(...platformWarnings);
  };

  validatePlatform('facebook', publishFacebook);
  validatePlatform('instagram', publishInstagram);

  if (mediaCount >= 10) {
    pushTip(tips, 'warn', 'Carousel is at the maximum of 10 items.');
  }

  if (scheduledAt) {
    const scheduleDate = new Date(scheduledAt);
    if (scheduleDate.getTime() < Date.now()) {
      pushTip(tips, 'warn', 'Schedule time is in the past — pick a future date.');
    }
  } else {
    pushTip(tips, 'warn', 'Set a schedule time before publishing or submitting for review.');
  }

  const complete = errors.length === 0;
  return { errors, warnings, tips, complete, platformStatus };
}
