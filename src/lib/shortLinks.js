import { invokeFunction } from '@/lib/supabaseFunctions';

export const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export function extractUrls(text = '') {
  const matches = text.match(URL_REGEX) || [];
  return [...new Set(matches.map((url) => url.replace(/[.,!?;:)\]]+$/, '')))];
}

export function isShortLink(url, appOrigin) {
  try {
    const parsed = new URL(url);
    const origin = appOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
    return parsed.origin === origin && parsed.pathname.startsWith('/s/');
  } catch {
    return false;
  }
}

export async function shortenUrlsInCaption(caption, { postId } = {}) {
  const urls = extractUrls(caption).filter((url) => !isShortLink(url));
  if (!urls.length) return caption;

  let next = caption;
  for (const url of urls) {
    const data = await invokeFunction('shortenUrl', { url, postId });
    if (data?.shortUrl) {
      next = next.split(url).join(data.shortUrl);
    }
  }
  return next;
}
