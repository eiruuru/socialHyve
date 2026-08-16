import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { readToken, writeToken } from './accountTokens.ts';

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

export function getUserClient(authHeader: string | null): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader || '' } },
  });
}

export async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing authorization');
  const supabase = getUserClient(authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return { supabase, user };
}

export async function getWorkspaceForUser(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Workspace not found');
  return data;
}

/** Organization for org members or owners (org id matches legacy workspace id). */
export async function getOrganizationForUser(supabase: SupabaseClient, userId: string) {
  const { data: member, error: memberErr } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(id, name, owner_id)')
    .eq('user_id', userId)
    .maybeSingle();
  if (memberErr) throw memberErr;
  if (member?.organizations) return member.organizations;

  const { data: owned, error: ownedErr } = await supabase
    .from('organizations')
    .select('id, name, owner_id')
    .eq('owner_id', userId)
    .maybeSingle();
  if (ownedErr) throw ownedErr;
  if (owned) return owned;

  return getWorkspaceForUser(supabase, userId);
}


export async function getCanvaConnection(
  service: SupabaseClient,
  orgId: string,
  clientId?: string | null,
) {
  let query = service.from('canva_connections').select('*');
  if (clientId) {
    query = query.eq('client_id', clientId);
  } else {
    query = query.eq('workspace_id', orgId).is('client_id', null);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    access_token: await readToken(data.access_token as string),
    refresh_token: await readToken(data.refresh_token as string),
  };
}

export async function refreshCanvaToken(
  service: SupabaseClient,
  connection: Record<string, unknown>,
) {
  const clientId = Deno.env.get('CANVA_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET') || '';
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const refreshToken = await readToken(connection.refresh_token as string);
  const res = await fetch(`${CANVA_API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Canva token refresh failed');

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await service.from('canva_connections').update({
    access_token: await writeToken(data.access_token),
    refresh_token: await writeToken(data.refresh_token || refreshToken),
    token_expires_at: expiresAt,
  }).eq('id', connection.id);

  return data.access_token as string;
}

export function randomString(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

export async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const META_GRAPH = 'https://graph.facebook.com/v21.0';
const CANVA_API = 'https://api.canva.com/rest/v1';

export { META_GRAPH, CANVA_API };
