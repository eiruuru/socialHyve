import { supabase } from '@/lib/supabase';
import { DEFAULT_IN_APP_PREFS } from './notificationTypes';

export async function listPersistedNotifications(limit = 50) {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}

export async function clearAllPersistedNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('user_notifications')
    .delete()
    .eq('user_id', user.id);
  if (error) throw error;
}

export async function markDerivedRead(notificationKey) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('user_notification_reads')
    .upsert({
      user_id: user.id,
      notification_key: notificationKey,
      read_at: new Date().toISOString(),
    }, { onConflict: 'user_id,notification_key' });
  if (error) throw error;
}

export async function markAllDerivedRead(keys) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !keys.length) return;
  const rows = keys.map((notification_key) => ({
    user_id: user.id,
    notification_key,
    read_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from('user_notification_reads')
    .upsert(rows, { onConflict: 'user_id,notification_key' });
  if (error) throw error;
}

export async function listDerivedReadKeys() {
  const { data, error } = await supabase
    .from('user_notification_reads')
    .select('notification_key');
  if (error) throw error;
  return new Set((data || []).map((r) => r.notification_key));
}

export async function createUserNotifications(rows) {
  const created = [];
  for (const row of rows) {
    const { data, error } = await supabase.rpc('create_user_notification', {
      p_user_id: row.userId,
      p_type: row.type,
      p_event: row.event,
      p_title: row.title,
      p_body: row.body || null,
      p_href: row.href || null,
      p_metadata: row.metadata || {},
    });
    if (!error && data) created.push(data);
  }
  return created;
}

export function isInAppEnabled(profile, event) {
  if (!profile) return true;
  if (profile.in_app_notifications_enabled === false) return false;
  const prefs = { ...DEFAULT_IN_APP_PREFS, ...(profile.in_app_notification_preferences || {}) };
  return prefs[event] !== false;
}

export function normalizeNotificationItem(item) {
  return {
    id: item.id,
    key: item.key || item.id,
    type: item.type,
    event: item.event,
    title: item.title,
    body: item.body || '',
    href: item.href || null,
    createdAt: item.createdAt || item.created_at,
    read: !!item.read || !!item.read_at,
    derived: !!item.derived,
    invite: item.invite || null,
    actions: item.actions || [],
  };
}
