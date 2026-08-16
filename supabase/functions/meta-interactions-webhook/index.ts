import { handleOptions, jsonResponse } from '../_shared/cors.ts';

const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'socialhyve-interactions';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  const url = new URL(req.url);

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return jsonResponse({ error: 'Verification failed' }, 403);
  }

  if (req.method === 'POST') {
    // MVP stub: acknowledge webhook; full sync can be triggered client-side or via cron.
    await req.json().catch(() => ({}));
    return jsonResponse({ received: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
});
