import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const INVITE_FROM_EMAIL = Deno.env.get('INVITE_FROM_EMAIL') || 'onboarding@resend.dev';
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

type WorkflowEvent =
  | 'submitted_for_review'
  | 'approved'
  | 'changes_requested'
  | 'publish_failed';

const EVENT_LABELS: Record<WorkflowEvent, string> = {
  submitted_for_review: 'Submitted for review',
  approved: 'Approved',
  changes_requested: 'Changes requested',
  publish_failed: 'Publish failed',
};

function shouldNotify(profile: Record<string, unknown>, event: WorkflowEvent): boolean {
  if (!profile.email_notifications_enabled) return false;
  const prefs = (profile.notification_preferences || {}) as Record<string, boolean>;
  return prefs[event] !== false;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (!RESEND_API_KEY) {
    return jsonResponse({ skipped: true, reason: 'Email not configured' });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const event = body.event as WorkflowEvent;
    const postId = body.postId as string;
    const recipientUserIds = (body.recipientUserIds || []) as string[];

    if (!event || !postId || !recipientUserIds.length) {
      return jsonResponse({ error: 'event, postId, and recipientUserIds required' }, 400);
    }

    const service = getServiceClient();
    const { data: post } = await service
      .from('posts')
      .select('id, internal_name, caption, client_id, clients(name)')
      .eq('id', postId)
      .maybeSingle();

    if (!post) return jsonResponse({ error: 'Post not found' }, 404);

    const { data: profiles } = await service
      .from('profiles')
      .select('id, email, full_name, email_notifications_enabled, notification_preferences')
      .in('id', recipientUserIds);

    const postTitle = post.internal_name || (post.caption ? `${post.caption.slice(0, 60)}…` : 'Post');
    const clientName = (post.clients as { name?: string } | null)?.name || 'your client';
    const link = `${APP_URL}/app/posts/${postId}`;
    const sent: string[] = [];

    for (const profile of profiles || []) {
      if (!profile.email || !shouldNotify(profile, event)) continue;

      const html = `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="font-family: Baloo 2, sans-serif;">${EVENT_LABELS[event]}</h2>
          <p><strong>${postTitle}</strong> for ${clientName} — ${EVENT_LABELS[event].toLowerCase()}.</p>
          <p><a href="${link}" style="display:inline-block;background:#F6A600;color:#1a1a1a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open post</a></p>
        </div>
      `;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: INVITE_FROM_EMAIL,
          to: [profile.email],
          subject: `[socialHyve] ${EVENT_LABELS[event]} — ${postTitle}`,
          html,
        }),
      });

      if (res.ok) sent.push(profile.email);
    }

    return jsonResponse({ ok: true, sent: sent.length });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
