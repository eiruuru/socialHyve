import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim() || null;
    const message = String(body.message || '').trim() || null;

    if (!email || !EMAIL_RE.test(email)) {
      return jsonResponse({ error: 'Valid email is required' }, 400);
    }

    const service = getServiceClient();

    const { data: pending } = await service
      .from('waitlist_requests')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (pending) {
      return jsonResponse({ ok: true, duplicate: true });
    }

    const { data: approved } = await service
      .from('waitlist_requests')
      .select('id')
      .eq('email', email)
      .eq('status', 'approved')
      .maybeSingle();

    if (approved) {
      return jsonResponse({ error: 'This email already has approved access' }, 409);
    }

    const { error } = await service.from('waitlist_requests').insert({
      email,
      name,
      message,
      status: 'pending',
    });

    if (error) throw error;

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
