import { assertOrgHasProPlan } from '../_shared/billing.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  CANVA_API,
  getCanvaConnection,
  getOrganizationForUser,
  getServiceClient,
  refreshCanvaToken,
  requireUser,
} from '../_shared/supabase.ts';

type FormatType = 'png' | 'jpg' | 'pdf' | 'gif' | 'mp4';
type ExportQuality = 'pro' | 'regular';

function buildFormatPayload(
  formatType: FormatType,
  pages?: number[],
  exportQuality: ExportQuality = 'pro',
) {
  const pageList = pages?.length ? pages : undefined;
  const qualityFields = { export_quality: exportQuality };

  switch (formatType) {
    case 'jpg':
      return {
        type: 'jpg',
        quality: 95,
        ...qualityFields,
        ...(pageList ? { pages: pageList } : {}),
      };
    case 'pdf':
      return { type: 'pdf', ...qualityFields, ...(pageList ? { pages: pageList } : {}) };
    case 'gif':
      return { type: 'gif', ...qualityFields, ...(pageList ? { pages: pageList } : {}) };
    case 'mp4':
      return { type: 'mp4', ...qualityFields };
    default:
      return {
        type: 'png',
        lossless: true,
        ...qualityFields,
        ...(pageList ? { pages: pageList } : {}),
      };
  }
}

function mimeAndExt(formatType: FormatType) {
  switch (formatType) {
    case 'jpg':
      return { mimeType: 'image/jpeg', ext: 'jpg' };
    case 'pdf':
      return { mimeType: 'application/pdf', ext: 'pdf' };
    case 'gif':
      return { mimeType: 'image/gif', ext: 'gif' };
    case 'mp4':
      return { mimeType: 'video/mp4', ext: 'mp4' };
    default:
      return { mimeType: 'image/png', ext: 'png' };
  }
}

function normalizeDownloadUrls(urls: unknown[]): string[] {
  return urls
    .map((u) => (typeof u === 'string' ? u : (u as { url?: string })?.url))
    .filter((u): u is string => typeof u === 'string' && u.length > 0);
}

function exportJobError(statusData: Record<string, unknown>) {
  const job = statusData.job as Record<string, unknown> | undefined;
  return job?.error as { code?: string; message?: string } | undefined;
}

function exportErrorMessage(statusData: Record<string, unknown>) {
  const err = exportJobError(statusData);
  if (err?.message) return err.message;
  if (err?.code === 'license_required') {
    return 'Canva Pro or a license is required to export this design.';
  }
  if (err?.code === 'approval_required') {
    return 'This design requires approval in Canva before it can be exported.';
  }
  return 'Canva export failed';
}

function isProQualityExportError(statusData: Record<string, unknown>): boolean {
  const err = exportJobError(statusData);
  if (err?.code === 'license_required') return true;
  const message = String(err?.message || '').toLowerCase();
  return message.includes('pro quality') || message.includes('required license');
}

async function runExportJob(
  designId: string,
  formatPayload: Record<string, unknown>,
  accessToken: string,
): Promise<string[]> {
  const exportRes = await fetch(`${CANVA_API}/exports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_id: designId,
      format: formatPayload,
    }),
  });
  const exportData = await exportRes.json();
  if (!exportRes.ok) {
    throw new Error(exportData.message || exportData.error || 'Export job creation failed');
  }

  const jobId = exportData.job?.id;
  if (!jobId) throw new Error('No export job ID returned');

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(`${CANVA_API}/exports/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const statusData = await statusRes.json();
    if (statusData.job?.status === 'success') {
      return normalizeDownloadUrls(statusData.job?.urls || []);
    }
    if (statusData.job?.status === 'failed') {
      const err = new Error(exportErrorMessage(statusData)) as Error & { statusData?: Record<string, unknown> };
      err.statusData = statusData;
      throw err;
    }
  }

  throw new Error('Export timed out');
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { supabase, user } = await requireUser(req);
    const org = await getOrganizationForUser(supabase, user.id);
    const body = await req.json();
    const {
      designId,
      formatType = 'png',
      format,
      pages,
      postId,
      clientId,
    } = body as {
      designId: string;
      formatType?: FormatType;
      format?: string;
      pages?: number[];
      postId?: string;
      clientId?: string;
    };

    const resolvedFormat = (formatType || format || 'png') as FormatType;

    if (!designId) return jsonResponse({ error: 'designId required' }, 400);

    if (clientId) {
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .maybeSingle();
      if (clientErr || !client) {
        return jsonResponse({ error: 'Client not found or access denied' }, 403);
      }
    }

    const service = getServiceClient();
    await assertOrgHasProPlan(service, org.id, 'Canva import');
    const connection = await getCanvaConnection(service, org.id, clientId);

    if (!connection) {
      return jsonResponse({ error: 'Canva not connected for this client' }, 400);
    }

    let accessToken = connection.access_token;
    if (new Date(connection.token_expires_at) <= new Date()) {
      accessToken = await refreshCanvaToken(service, connection);
    }

    let downloadUrls: string[] = [];
    const proFormat = buildFormatPayload(resolvedFormat, pages, 'pro');
    try {
      downloadUrls = await runExportJob(designId, proFormat, accessToken);
    } catch (err) {
      const statusData = (err as Error & { statusData?: Record<string, unknown> }).statusData;
      if (statusData && isProQualityExportError(statusData)) {
        downloadUrls = await runExportJob(
          designId,
          buildFormatPayload(resolvedFormat, pages, 'regular'),
          accessToken,
        );
      } else {
        throw err;
      }
    }

    if (!downloadUrls.length) throw new Error('Export returned no files');

    const { mimeType, ext } = mimeAndExt(resolvedFormat);
    const pathPrefix = clientId ? `${org.id}/${clientId}` : org.id;
    const pageNumbers = pages?.length ? pages : downloadUrls.map((_, i) => i + 1);
    const files: Array<{
      publicUrl: string;
      storagePath: string;
      mimeType: string;
      page: number;
      canvaDesignId: string;
    }> = [];

    for (let i = 0; i < downloadUrls.length; i++) {
      const pageNum = pageNumbers[i] ?? i + 1;
      const fileRes = await fetch(downloadUrls[i]);
      if (!fileRes.ok) throw new Error(`Failed to download exported file (page ${pageNum})`);
      const fileBytes = new Uint8Array(await fileRes.arrayBuffer());
      const storagePath = `${pathPrefix}/${postId || 'draft'}/${designId}-p${pageNum}.${ext}`;

      const { error: uploadErr } = await service.storage
        .from('post-media')
        .upload(storagePath, fileBytes, { contentType: mimeType, upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = service.storage.from('post-media').getPublicUrl(storagePath);

      files.push({
        publicUrl: publicUrlData.publicUrl,
        storagePath,
        mimeType,
        page: pageNum,
        canvaDesignId: designId,
      });
    }

    if (postId && files.length === 1) {
      const { data: media, error: mediaErr } = await supabase
        .from('post_media')
        .insert({
          post_id: postId,
          source: 'canva',
          canva_design_id: designId,
          storage_path: files[0].storagePath,
          public_url: files[0].publicUrl,
          mime_type: files[0].mimeType,
          sort_order: 0,
        })
        .select()
        .single();
      if (mediaErr) throw mediaErr;
      return jsonResponse({ files, media, publicUrl: files[0].publicUrl });
    }

    return jsonResponse({ files });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
