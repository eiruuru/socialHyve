const CREEM_TEST_MODE = (Deno.env.get('CREEM_TEST_MODE') || 'true') === 'true';
const CREEM_API_KEY = Deno.env.get('CREEM_API_KEY') || '';
const CREEM_WEBHOOK_SECRET = Deno.env.get('CREEM_WEBHOOK_SECRET') || '';
const CREEM_PRODUCT_STARTER = Deno.env.get('CREEM_PRODUCT_STARTER') || '';
const CREEM_PRODUCT_PRO = Deno.env.get('CREEM_PRODUCT_PRO') || '';
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

export function getCreemApiBase() {
  return CREEM_TEST_MODE ? 'https://test-api.creem.io/v1' : 'https://api.creem.io/v1';
}

export function getCreemConfig() {
  return {
    apiKey: CREEM_API_KEY,
    webhookSecret: CREEM_WEBHOOK_SECRET,
    testMode: CREEM_TEST_MODE,
    productStarter: CREEM_PRODUCT_STARTER,
    productPro: CREEM_PRODUCT_PRO,
    appUrl: APP_URL,
  };
}

export function planForProductId(productId: string): 'starter' | 'pro' | null {
  if (!productId) return null;
  if (productId === CREEM_PRODUCT_STARTER) return 'starter';
  if (productId === CREEM_PRODUCT_PRO) return 'pro';
  return null;
}

export function productIdForPlan(plan: string): string | null {
  if (plan === 'starter') return CREEM_PRODUCT_STARTER || null;
  if (plan === 'pro') return CREEM_PRODUCT_PRO || null;
  return null;
}

export async function creemFetch(path: string, init: RequestInit = {}) {
  const base = getCreemApiBase();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'x-api-key': CREEM_API_KEY,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { message?: string; error?: string })?.message
      || (data as { error?: string })?.error
      || `Creem API error (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function verifyCreemSignature(rawBody: string, signatureHeader: string | null) {
  if (!CREEM_WEBHOOK_SECRET) throw new Error('CREEM_WEBHOOK_SECRET is not configured');
  if (!signatureHeader) throw new Error('Missing creem-signature header');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(CREEM_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody),
  );

  const expected = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const received = signatureHeader.trim().toLowerCase();
  if (expected !== received) {
    throw new Error('Invalid webhook signature');
  }
}
