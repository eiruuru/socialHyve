import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { CANVA_API, getServiceClient, getWorkspaceForUser, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { supabase, user } = await requireUser(req);
    const workspace = await getWorkspaceForUser(supabase, user.id);
    const { designId, format = 'png', postId } = await req.json();

    if (!designId) return jsonResponse({ error: 'designId required' }, 400);

    const service = getServiceClient();
    const { data: connection } = await service
      .from('canva_connections')
      .select('*')
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (!connection) return jsonResponse({ error: 'Canva not connected' }, 400);

    let accessToken = connection.access_token;
    if (new Date(connection.token_expires_at) <= new Date()) {
      accessToken = await refreshCanvaToken(service, connection);
    }

    const exportRes = await fetch(`${CANVA_API}/exports`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_id: designId,
        format: { type: format },
      }),
    });
    const exportData = await exportRes.json();
    if (!exportRes.ok) throw new Error(exportData.message || 'Export job creation failed');

    const jobId = exportData.job?.id;
    if (!jobId) throw new Error('No export job ID returned');

    let downloadUrls: string[] = [];
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(`${CANVA_API}/exports/${jobId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const statusData = await statusRes.json();
      if (statusData.job?.status === 'success') {
        downloadUrls = (statusData.job?.urls || []).map((u: { url: string }) => u.url);
        break;
      }
      if (statusData.job?.status === 'failed') {
        throw new Error(statusData.job?.error?.message || 'Canva export failed');
      }
    }

    if (!downloadUrls.length) throw new Error('Export timed out');

    const fileRes = await fetch(downloadUrls[0]);
    const fileBytes = new Uint8Array(await fileRes.arrayBuffer());
    const mimeType = format === 'mp4' ? 'video/mp4' : format === 'jpg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'mp4' ? 'mp4' : format === 'jpg' ? 'jpg' : 'png';
    const storagePath = `${workspace.id}/${postId || 'draft'}/${designId}.${ext}`;

    const { error: uploadErr } = await service.storage
      .from('post-media')
      .upload(storagePath, fileBytes, { contentType: mimeType, upsert: true });

    if (uploadErr) throw uploadErr;

    const { data: publicUrlData } = service.storage.from('post-media').getPublicUrl(storagePath);

    const mediaRecord = {
      post_id: postId || null,
      source: 'canva',
      canva_design_id: designId,
      storage_path: storagePath,
      public_url: publicUrlData.publicUrl,
      mime_type: mimeType,
      sort_order: 0,
    };

    if (postId) {
      const { data: media, error: mediaErr } = await supabase
        .from('post_media')
        .insert(mediaRecord)
        .select()
        .single();
      if (mediaErr) throw mediaErr;
      return jsonResponse({ media, publicUrl: publicUrlData.publicUrl });
    }

    return jsonResponse({ publicUrl: publicUrlData.publicUrl, storagePath, mimeType, canvaDesignId: designId });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});

async function refreshCanvaToken(service: ReturnType<typeof getServiceClient>, connection: Record<string, unknown>) {
  const clientId = Deno.env.get('CANVA_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET') || '';
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token as string,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Canva token refresh failed');

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await service.from('canva_connections').update({
    access_token: data.access_token,
    refresh_token: data.refresh_token || connection.refresh_token,
    token_expires_at: expiresAt,
  }).eq('id', connection.id);

  return data.access_token;
}
