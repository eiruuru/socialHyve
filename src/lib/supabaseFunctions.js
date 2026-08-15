import { supabase } from './supabase';

const FUNCTION_MAP = {
  metaOAuthStart: 'meta-oauth-start',
  metaOAuthCallback: 'meta-oauth-callback',
  canvaOAuthStart: 'canva-oauth-start',
  canvaOAuthCallback: 'canva-oauth-callback',
  canvaListDesigns: 'canva-list-designs',
  canvaGetDesign: 'canva-get-design',
  canvaExportDesign: 'canva-export-design',
  publishPost: 'publish-post',
  refreshTokens: 'refresh-tokens',
  reviewByToken: 'review-by-token',
  acceptInvite: 'accept-invite',
  sendInviteEmail: 'send-invite-email',
};

async function functionErrorMessage(error) {
  if (!error) return 'Request failed';
  if (error.context && typeof error.context.json === 'function') {
    try {
      const payload = await error.context.clone().json();
      if (payload?.error) return payload.error;
    } catch {
      // fall through to generic message
    }
  }
  return error.message || 'Request failed';
}

export async function invokeFunction(name, body = {}) {
  const fnName = FUNCTION_MAP[name] || name;
  const { data, error } = await supabase.functions.invoke(fnName, { body });
  if (error) throw new Error(await functionErrorMessage(error));
  return data;
}

export async function invokeFunctionGet(name, params = {}) {
  const fnName = FUNCTION_MAP[name] || name;
  const query = new URLSearchParams(params).toString();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}${query ? `?${query}` : ''}`;
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}
