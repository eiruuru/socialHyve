import { handleOptions, jsonResponse } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const INVITE_FROM_EMAIL = Deno.env.get('INVITE_FROM_EMAIL') || 'onboarding@resend.dev';
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

function inviteLink(type: string, token: string) {
  const param = type === 'organization' ? 'invite' : 'clientInvite';
  return `${APP_URL}/app/login?${param}=${token}`;
}

function formatClientRole(role: string): string {
  if (role === 'approver') return 'Creatives QA';
  if (role === 'viewer') return 'Guest';
  return role;
}

function buildHtml({
  inviterName,
  targetName,
  role,
  link,
  type,
}: {
  inviterName: string;
  targetName: string;
  role: string;
  link: string;
  type: string;
}) {
  const context = type === 'organization'
    ? `join <strong>${targetName}</strong> on socialHyve`
    : `review posts for <strong>${targetName}</strong>`;
  return `
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="font-family: Baloo 2, sans-serif;">You're invited</h2>
      <p>${inviterName} invited you to ${context} as <strong>${role}</strong>.</p>
      <p><a href="${link}" style="display:inline-block;background:#F6A600;color:#1a1a1a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Accept invite</a></p>
      <p style="font-size:12px;color:#666;">Or copy this link: ${link}</p>
      <p style="font-size:12px;color:#666;">This invite expires in 7 days.</p>
    </div>
  `;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (!RESEND_API_KEY) {
    return jsonResponse({ skipped: true, reason: 'Email not configured' });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { type, token, email, inviterName, targetName, role } = body;

    if (!type || !token || !email) {
      return jsonResponse({ error: 'type, token, and email required' }, 400);
    }

    const link = inviteLink(type, token);
    const html = buildHtml({
      inviterName: inviterName || 'Someone',
      targetName: targetName || 'socialHyve',
      role: type === 'client' ? formatClientRole(role || 'approver') : (role || 'member'),
      link,
      type,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: INVITE_FROM_EMAIL,
        to: [email],
        subject: `You're invited to ${targetName || 'socialHyve'}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return jsonResponse({ error: err.message || 'Failed to send email' }, 502);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
