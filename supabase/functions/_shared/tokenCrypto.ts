/**
 * Optional token encryption helpers for social account tokens at rest.
 * Set TOKEN_ENCRYPTION_KEY in Edge Function secrets to enable.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getKey(): Promise<CryptoKey | null> {
  const secret = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!secret) return null;
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(value: string): Promise<string> {
  const key = await getKey();
  if (!key) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(value),
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return `enc:${btoa(String.fromCharCode(...combined))}`;
}

export async function decryptToken(value: string): Promise<string> {
  if (!value.startsWith('enc:')) return value;
  const key = await getKey();
  if (!key) return value;
  const raw = Uint8Array.from(atob(value.slice(4)), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return decoder.decode(decrypted);
}
