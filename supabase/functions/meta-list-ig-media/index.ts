import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, META_GRAPH, requireUser } from '../_shared/supabase.ts';
import { pickPrimaryAccount } from '../_shared/socialAccounts.ts';

type IgMediaItem = {
  id?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp?: string;
  permalink?: string;
  children?: { data?: IgMediaItem[] };
};

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));
    await requireUser(req);

    const clientId = body.clientId as string | undefined;
    if (!clientId) return jsonResponse({ error: 'clientId required' }, 400);

    const service = getServiceClient();
    const { data: accounts, error: accountErr } = await service
      .from('social_accounts')
      .select('*')
      .eq('client_id', clientId)
      .eq('platform', 'instagram');

    if (accountErr) throw accountErr;
    const account = pickPrimaryAccount(accounts || [], 'instagram');
    if (!account) return jsonResponse({ media: [] });

    const igUserId = account.ig_user_id || account.external_id;
    const token = account.page_access_token || account.access_token;
    if (!igUserId || !token) return jsonResponse({ media: [] });

    const url = new URL(`${META_GRAPH}/${igUserId}/media`);
    url.searchParams.set(
      'fields',
      'id,media_type,media_url,thumbnail_url,timestamp,permalink,children{media_type,media_url,thumbnail_url}',
    );
    url.searchParams.set('limit', '12');
    url.searchParams.set('access_token', token);

    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const media = (data.data || []).map((item: IgMediaItem) => {
      const isVideo = (item.media_type || '').includes('VIDEO');
      const children = item.children?.data || [];
      const isCarousel = item.media_type === 'CAROUSEL_ALBUM' || children.length > 0;
      const firstChild = children[0];
      const thumbUrl = isCarousel && firstChild
        ? (firstChild.media_type?.includes('VIDEO')
          ? firstChild.thumbnail_url || firstChild.media_url
          : firstChild.media_url)
        : isVideo
        ? item.thumbnail_url || item.media_url
        : item.media_url;

      return {
        id: `ig-${item.id}`,
        external: true,
        timestamp: item.timestamp,
        permalink: item.permalink,
        isCarousel,
        post_media: [{
          public_url: thumbUrl,
          mime_type: isVideo ? 'video/mp4' : 'image/jpeg',
          sort_order: 0,
        }],
      };
    });

    return jsonResponse({ media });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
