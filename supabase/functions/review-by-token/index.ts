import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token as string;
    if (!token) return jsonResponse({ error: 'token required' }, 400);

    const service = getServiceClient();
    const { data: row, error } = await service
      .from('post_review_tokens')
      .select('*, posts(*, post_media(*))')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .maybeSingle();

    if (error || !row) {
      return jsonResponse({ error: 'Invalid or expired review link' }, 404);
    }

    if (body.action === 'submit') {
      const post = row.posts;
      if (body.comment) {
        await service.from('post_comments').insert({
          post_id: post.id,
          user_id: null,
          body: body.comment,
          visibility: 'client',
        });
      }
      const approvalStatus = body.approvalAction === 'approve' ? 'approved' : 'changes_requested';
      await service.from('posts').update({ approval_status: approvalStatus }).eq('id', post.id);
      await service.from('post_review_tokens').update({ used_at: new Date().toISOString() }).eq('token', token);
      await service.from('post_activity').insert({
        post_id: post.id,
        user_id: null,
        action: 'review_link',
        detail: `Review link: ${body.approvalAction}`,
      });
      return jsonResponse({ ok: true, approvalStatus });
    }

    const media = (row.posts?.post_media || []).sort(
      (a: { sort_order?: number }, b: { sort_order?: number }) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );

    return jsonResponse({
      post: { ...row.posts, post_media: media },
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
