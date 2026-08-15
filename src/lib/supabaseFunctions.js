import { supabase } from './supabase';

const FUNCTION_MAP = {
  metaOAuthStart: 'meta-oauth-start',
  metaOAuthCallback: 'meta-oauth-callback',
  canvaOAuthStart: 'canva-oauth-start',
  canvaOAuthCallback: 'canva-oauth-callback',
  canvaListDesigns: 'canva-list-designs',
  canvaExportDesign: 'canva-export-design',
  publishPost: 'publish-post',
  refreshTokens: 'refresh-tokens',
  reviewByToken: 'review-by-token',
};

export async function invokeFunction(name, body = {}) {
  const fnName = FUNCTION_MAP[name] || name;
  const { data, error } = await supabase.functions.invoke(fnName, { body });
  if (error) throw error;
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
