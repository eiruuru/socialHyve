import { MAX_CAROUSEL_ITEMS } from './previews/mediaUtils.js';
import { FB_CAPTION_LIMIT, IG_CAPTION_LIMIT } from './platformOverrides.js';

export function validatePost({
  caption,
  media,
  publishInstagram,
  publishFacebook,
  requireInstagramMedia = true,
}) {
  const errors = [];
  if (requireInstagramMedia && publishInstagram && !media.length) {
    errors.push('Instagram requires at least one image or video.');
  }
  if (media.length > MAX_CAROUSEL_ITEMS) {
    errors.push(`Maximum ${MAX_CAROUSEL_ITEMS} media items per carousel.`);
  }
  if (publishInstagram && caption.length > IG_CAPTION_LIMIT) {
    errors.push(`Instagram caption exceeds ${IG_CAPTION_LIMIT} characters.`);
  }
  if (publishFacebook && caption.length > FB_CAPTION_LIMIT) {
    errors.push(`Facebook caption exceeds ${FB_CAPTION_LIMIT} characters.`);
  }
  return errors;
}
