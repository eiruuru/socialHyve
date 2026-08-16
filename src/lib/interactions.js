import { supabase } from './supabase';
import { invokeFunction } from './supabaseFunctions';

export async function syncInteractions(clientId) {
  return invokeFunction('metaSyncInteractions', { clientId });
}

export async function replyToThread(threadId, message) {
  return invokeFunction('metaReplyInteraction', { threadId, message });
}

export async function interactionAction(threadId, action, extra = {}) {
  return invokeFunction('metaInteractionAction', { threadId, action, ...extra });
}

export async function listInteractionThreads(clientId, {
  status = 'open',
  platform,
  channel,
  search,
} = {}) {
  let query = supabase
    .from('interaction_threads')
    .select('*')
    .eq('client_id', clientId)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (platform && platform !== 'all') {
    query = query.eq('platform', platform);
  }
  if (channel && channel !== 'all') {
    query = query.eq('channel', channel);
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`participant_name.ilike.${term},participant_handle.ilike.${term},preview_text.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function listInteractionMessages(threadId) {
  const { data, error } = await supabase
    .from('interaction_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateInteractionThread(threadId, patch) {
  const { data, error } = await supabase
    .from('interaction_threads')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', threadId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getInteractionSyncState(clientId) {
  const { data, error } = await supabase
    .from('interaction_sync_state')
    .select('*, social_accounts(name, platform)')
    .eq('client_id', clientId);

  if (error) throw error;
  return data || [];
}
