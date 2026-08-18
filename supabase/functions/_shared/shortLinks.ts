import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SLUG_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateSlug(length = 8): string {
  let slug = '';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i += 1) {
    slug += SLUG_CHARS[bytes[i] % SLUG_CHARS.length];
  }
  return slug;
}

export function getAppUrl(): string {
  return (Deno.env.get('APP_URL') || 'http://localhost:5173').replace(/\/$/, '');
}

export function buildShortUrl(slug: string): string {
  return `${getAppUrl()}/s/${slug}`;
}

export const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) || [];
  return [...new Set(matches.map((url) => url.replace(/[.,!?;:)\]]+$/, '')))];
}

export async function createShortLink(
  service: SupabaseClient,
  {
    organizationId,
    originalUrl,
    postId,
  }: {
    organizationId: string;
    originalUrl: string;
    postId?: string | null;
  },
): Promise<{ slug: string; shortUrl: string }> {
  const normalizedUrl = originalUrl.trim();
  if (!normalizedUrl) throw new Error('URL required');

  let existingQuery = service
    .from('short_links')
    .select('slug')
    .eq('organization_id', organizationId)
    .eq('original_url', normalizedUrl);

  if (postId) {
    existingQuery = existingQuery.eq('post_id', postId);
  } else {
    existingQuery = existingQuery.is('post_id', null);
  }

  const { data: existing } = await existingQuery.maybeSingle();
  if (existing?.slug) {
    return { slug: existing.slug, shortUrl: buildShortUrl(existing.slug) };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = generateSlug();
    const { error } = await service.from('short_links').insert({
      organization_id: organizationId,
      slug,
      original_url: normalizedUrl,
      post_id: postId || null,
    });
    if (!error) {
      return { slug, shortUrl: buildShortUrl(slug) };
    }
    if (error.code !== '23505') throw error;
  }

  throw new Error('Could not generate unique short link');
}

export async function shortenCaptionUrls(
  service: SupabaseClient,
  caption: string,
  organizationId: string,
  postId?: string | null,
): Promise<string> {
  const urls = extractUrls(caption);
  if (!urls.length) return caption;

  let next = caption;
  for (const url of urls) {
    const { shortUrl } = await createShortLink(service, {
      organizationId,
      originalUrl: url,
      postId,
    });
    next = next.split(url).join(shortUrl);
  }
  return next;
}
