import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, META_GRAPH } from '../_shared/supabase.ts';

const BUCKET = 'post-media';
const ARCHIVE_AFTER_DAYS = 30;
const ORPHAN_AFTER_DAYS = 7;
const PREVIEW_MAX_WIDTH = 800;
const PREVIEW_JPEG_QUALITY = 75;

type ServiceClient = ReturnType<typeof getServiceClient>;

type MediaRow = {
  id: string;
  post_id: string;
  storage_path: string | null;
  preview_storage_path: string | null;
  original_storage_path: string | null;
  public_url: string | null;
  mime_type: string | null;
  sort_order: number;
  archived_at: string | null;
};

type PostTarget = {
  platform: string;
  external_post_id: string | null;
  permalink: string | null;
};

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));
    const service = getServiceClient();
    const mode = body.mode || 'all';

    const result: Record<string, unknown> = {};

    if (mode === 'orphans' || mode === 'all') {
      result.orphans = await cleanupOrphans(service);
    }

    if (mode === 'archive' || mode === 'all') {
      result.archive = await archivePublishedMedia(service);
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

async function loadReferencedPaths(service: ServiceClient): Promise<Set<string>> {
  const { data, error } = await service
    .from('post_media')
    .select('storage_path, preview_storage_path, original_storage_path');
  if (error) throw error;

  const paths = new Set<string>();
  for (const row of data || []) {
    for (const path of [row.storage_path, row.preview_storage_path, row.original_storage_path]) {
      if (path) paths.add(path);
    }
  }
  return paths;
}

async function cleanupOrphans(service: ServiceClient) {
  const referenced = await loadReferencedPaths(service);
  const cutoff = Date.now() - ORPHAN_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const prefixes = await listDraftPrefixes(service);
  const toDelete: string[] = [];
  const errors: string[] = [];

  for (const prefix of prefixes) {
    const objects = await listAllObjects(service, prefix);
    for (const obj of objects) {
      if (referenced.has(obj.path)) continue;
      const updatedAt = obj.updatedAt ? new Date(obj.updatedAt).getTime() : 0;
      if (updatedAt && updatedAt > cutoff) continue;
      toDelete.push(obj.path);
    }
  }

  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    const { error } = await service.storage.from(BUCKET).remove(batch);
    if (error) errors.push(error.message);
  }

  return { deleted: toDelete.length, errors };
}

async function listDraftPrefixes(service: ServiceClient): Promise<string[]> {
  const prefixes = new Set<string>();

  const { data: orgs } = await service.from('organizations').select('id');
  for (const org of orgs || []) {
    prefixes.add(`${org.id}/draft`);
  }

  const { data: clients } = await service.from('clients').select('id, organization_id');
  for (const client of clients || []) {
    prefixes.add(`${client.organization_id}/${client.id}/draft`);
  }

  const { data: workspaces } = await service.from('workspaces').select('id');
  for (const ws of workspaces || []) {
    prefixes.add(`${ws.id}/draft`);
  }

  return [...prefixes];
}

async function listAllObjects(
  service: ServiceClient,
  prefix: string,
): Promise<Array<{ path: string; updatedAt?: string }>> {
  const results: Array<{ path: string; updatedAt?: string }> = [];
  const queue = [prefix];

  while (queue.length) {
    const current = queue.shift()!;
    const { data, error } = await service.storage.from(BUCKET).list(current, {
      limit: 1000,
      sortBy: { column: 'updated_at', order: 'asc' },
    });
    if (error || !data) continue;

    for (const item of data) {
      const path = current ? `${current}/${item.name}` : item.name;
      if (item.id) {
        results.push({ path, updatedAt: item.updated_at });
      } else {
        queue.push(path);
      }
    }
  }

  return results;
}

async function archivePublishedMedia(service: ServiceClient) {
  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts, error: postsErr } = await service
    .from('posts')
    .select('id, client_id, workspace_id, post_media(*), post_targets(*)')
    .eq('status', 'published')
    .lt('published_at', cutoff);
  if (postsErr) throw postsErr;

  let archived = 0;
  let bytesFreed = 0;
  const errors: string[] = [];

  for (const post of posts || []) {
    const mediaRows = ((post.post_media || []) as MediaRow[])
      .filter((m) => !m.archived_at)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    if (!mediaRows.length) continue;

    const igTarget = ((post.post_targets || []) as PostTarget[]).find(
      (t) => t.platform === 'instagram' && t.external_post_id,
    );
    const fbTarget = ((post.post_targets || []) as PostTarget[]).find(
      (t) => t.platform === 'facebook' && t.external_post_id,
    );

    const igToken = igTarget ? await getPlatformToken(service, post, 'instagram') : null;
    const fbToken = fbTarget ? await getPlatformToken(service, post, 'facebook') : null;

    let igThumbnails: string[] = [];
    if (igTarget?.external_post_id && igToken) {
      igThumbnails = await fetchIgThumbnailUrls(igTarget.external_post_id, igToken);
    }

    let fbPictures: string[] = [];
    if (fbTarget?.external_post_id && fbToken) {
      fbPictures = await fetchFbPictureUrls(fbTarget.external_post_id, fbToken);
    }

    for (let i = 0; i < mediaRows.length; i++) {
      const row = mediaRows[i];
      try {
        const freed = await archiveMediaRow(service, row, {
          igThumbnailUrl: igThumbnails[i] || igThumbnails[0] || null,
          fbPictureUrl: fbPictures[i] || fbPictures[0] || null,
        });
        archived += 1;
        bytesFreed += freed;
      } catch (err) {
        errors.push(`${row.id}: ${(err as Error).message}`);
      }
    }
  }

  return { archived, bytesFreed, errors };
}

async function getPlatformToken(
  service: ServiceClient,
  post: { client_id?: string | null; workspace_id?: string | null },
  platform: string,
): Promise<string | null> {
  let query = service.from('social_accounts').select('page_access_token, access_token');
  query = post.client_id
    ? query.eq('client_id', post.client_id)
    : query.eq('workspace_id', post.workspace_id);
  const { data } = await query.eq('platform', platform).maybeSingle();
  if (!data) return null;
  return (data.page_access_token || data.access_token) as string;
}

async function fetchIgThumbnailUrls(externalPostId: string, token: string): Promise<string[]> {
  try {
    const url = new URL(`${META_GRAPH}/${externalPostId}`);
    url.searchParams.set(
      'fields',
      'media_type,media_url,thumbnail_url,children{media_type,media_url,thumbnail_url}',
    );
    url.searchParams.set('access_token', token);
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) return [];

    const urls: string[] = [];
    const pushItem = (item: Record<string, string>) => {
      const isVideo = (item.media_type || '').includes('VIDEO');
      urls.push(isVideo ? (item.thumbnail_url || item.media_url) : item.media_url);
    };

    if (data.children?.data?.length) {
      for (const child of data.children.data) pushItem(child);
    } else {
      pushItem(data);
    }

    return urls.filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchFbPictureUrls(externalPostId: string, token: string): Promise<string[]> {
  try {
    const url = new URL(`${META_GRAPH}/${externalPostId}`);
    url.searchParams.set('fields', 'full_picture,attachments{media{image{src}}}');
    url.searchParams.set('access_token', token);
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) return [];

    const urls: string[] = [];
    const attachments = data.attachments?.data || [];
    for (const attachment of attachments) {
      const subattachments = attachment.subattachments?.data || [attachment];
      for (const sub of subattachments) {
        const src = sub.media?.image?.src || sub.url;
        if (src) urls.push(src);
      }
    }
    if (!urls.length && data.full_picture) urls.push(data.full_picture);
    return urls;
  } catch {
    return [];
  }
}

async function archiveMediaRow(
  service: ServiceClient,
  row: MediaRow,
  sources: { igThumbnailUrl: string | null; fbPictureUrl: string | null },
): Promise<number> {
  const storagePath = row.storage_path;
  if (!storagePath) throw new Error('Missing storage_path');

  const isVideo = (row.mime_type || '').startsWith('video/');
  let bytesFreed = 0;

  if (isVideo) {
    const posterBytes = await resolveVideoPosterBytes(sources);
    const posterPath = storagePath.replace(/\.[^./]+$/, '') + `-poster-${row.id}.jpg`;
    const { error: uploadErr } = await service.storage.from(BUCKET).upload(posterPath, posterBytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (uploadErr) throw uploadErr;

    const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(posterPath);
    const { data: originalFile } = await service.storage.from(BUCKET).download(storagePath);
    bytesFreed = originalFile?.size || 0;

    const { error: updateErr } = await service
      .from('post_media')
      .update({
        original_storage_path: storagePath,
        original_mime_type: row.mime_type,
        preview_storage_path: posterPath,
        storage_path: posterPath,
        public_url: urlData.publicUrl,
        mime_type: 'image/jpeg',
        archived_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (updateErr) throw updateErr;

    await service.storage.from(BUCKET).remove([storagePath]);
    return bytesFreed;
  }

  const { data: file, error: downloadErr } = await service.storage.from(BUCKET).download(storagePath);
  if (downloadErr || !file) throw downloadErr || new Error('Failed to download media');

  const originalBytes = new Uint8Array(await file.arrayBuffer());
  bytesFreed = originalBytes.byteLength;
  const previewBytes = await createPreviewJpeg(originalBytes);
  const previewPath = storagePath.replace(/\.[^./]+$/, '') + `-preview-${row.id}.jpg`;

  const { error: uploadErr } = await service.storage.from(BUCKET).upload(previewPath, previewBytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (uploadErr) throw uploadErr;

  const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(previewPath);
  const { error: updateErr } = await service
    .from('post_media')
    .update({
      original_storage_path: storagePath,
      preview_storage_path: previewPath,
      storage_path: previewPath,
      public_url: urlData.publicUrl,
      archived_at: new Date().toISOString(),
    })
    .eq('id', row.id);
  if (updateErr) throw updateErr;

  await service.storage.from(BUCKET).remove([storagePath]);
  return bytesFreed;
}

async function createPreviewJpeg(bytes: Uint8Array): Promise<Uint8Array> {
  const image = await Image.decode(bytes);
  if (image.width > PREVIEW_MAX_WIDTH) {
    const height = Math.max(1, Math.round((image.height * PREVIEW_MAX_WIDTH) / image.width));
    image.resize(PREVIEW_MAX_WIDTH, height);
  }
  return await image.encodeJPEG(PREVIEW_JPEG_QUALITY);
}

async function resolveVideoPosterBytes(
  sources: { igThumbnailUrl: string | null; fbPictureUrl: string | null },
): Promise<Uint8Array> {
  const remoteUrl = sources.igThumbnailUrl || sources.fbPictureUrl;
  if (remoteUrl) {
    try {
      const res = await fetch(remoteUrl);
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        return await createPreviewJpeg(bytes);
      }
    } catch {
      // fall through to placeholder
    }
  }
  return createVideoPlaceholder();
}

async function createVideoPlaceholder(): Promise<Uint8Array> {
  const image = new Image(800, 450);
  image.fill(0x2a2a2aff);
  return await image.encodeJPEG(PREVIEW_JPEG_QUALITY);
}
