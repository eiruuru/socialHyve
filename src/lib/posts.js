import { supabase } from './supabase';
import { stampWorkspaceId, getCurrentWorkspaceId } from './workspace';

export async function listPosts(filters = {}) {
  let query = supabase
    .from('posts')
    .select('*, post_media(*), post_targets(*)')
    .order('scheduled_at', { ascending: true, nullsFirst: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.from) query = query.gte('scheduled_at', filters.from);
  if (filters.to) query = query.lte('scheduled_at', filters.to);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getPost(id) {
  const { data, error } = await supabase
    .from('posts')
    .select('*, post_media(*), post_targets(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createPost(postData) {
  const payload = await stampWorkspaceId(postData);
  const { data, error } = await supabase.from('posts').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updatePost(id, updates) {
  const { data, error } = await supabase.from('posts').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePost(id) {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

export async function addPostMedia(postId, media) {
  const { data, error } = await supabase
    .from('post_media')
    .insert({ ...media, post_id: postId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removePostMedia(id) {
  const { error } = await supabase.from('post_media').delete().eq('id', id);
  if (error) throw error;
}

export async function schedulePost(postId, scheduledAt) {
  const post = await updatePost(postId, { status: 'scheduled', scheduled_at: scheduledAt });
  await supabase.from('publish_jobs').upsert({
    post_id: postId,
    attempts: 0,
    next_run_at: scheduledAt,
    last_error: null,
  }, { onConflict: 'post_id' });
  return post;
}

export async function listSocialAccounts() {
  const { data, error } = await supabase.from('social_accounts').select('*').order('platform');
  if (error) throw error;
  return data;
}

export async function disconnectSocialAccount(id) {
  const { error } = await supabase.from('social_accounts').delete().eq('id', id);
  if (error) throw error;
}

export async function getCanvaConnection() {
  const { data, error } = await supabase.from('canva_connections').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function disconnectCanva() {
  const { error } = await supabase.from('canva_connections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

export async function uploadMediaFile(postId, file) {
  const workspaceId = await getCurrentWorkspaceId();
  const ext = file.name.split('.').pop();
  const path = `${workspaceId}/${postId}/${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('post-media')
    .upload(path, file, { upsert: true });
  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);
  return addPostMedia(postId, {
    source: 'upload',
    storage_path: path,
    public_url: urlData.publicUrl,
    mime_type: file.type,
    sort_order: 0,
  });
}
