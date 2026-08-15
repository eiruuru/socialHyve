import { supabase } from './supabase';
import { stampWorkspaceId, getCurrentWorkspaceId } from './workspace';
import { getActiveClientId } from './clientContext';

async function stampClientId(data) {
  const clientId = getActiveClientId();
  const base = await stampWorkspaceId(data);
  return clientId ? { ...base, client_id: clientId } : base;
}

function applyClientFilter(query, clientId) {
  if (clientId) return query.eq('client_id', clientId);
  return query;
}

export async function listPosts(filters = {}) {
  const clientId = getActiveClientId();
  let query = supabase
    .from('posts')
    .select('*, post_media(*), post_targets(*)')
    .order('scheduled_at', { ascending: true, nullsFirst: false });

  query = applyClientFilter(query, clientId);
  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.publishInstagram) query = query.eq('publish_instagram', true);
  if (filters.from) query = query.gte('scheduled_at', filters.from);
  if (filters.to) query = query.lte('scheduled_at', filters.to);
  if (filters.includeFuture === false) {
    query = query.in('status', ['published']);
  }

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
  const payload = await stampClientId(postData);
  const { data, error } = await supabase.from('posts').insert(payload).select().single();
  if (error) throw error;
  await logPostActivity(data.id, 'created', 'Post created');
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
  await logPostActivity(postId, 'scheduled', `Scheduled for ${scheduledAt}`);
  await supabase.from('publish_jobs').upsert({
    post_id: postId,
    attempts: 0,
    next_run_at: scheduledAt,
    last_error: null,
  }, { onConflict: 'post_id' });
  return post;
}

export async function listSocialAccounts() {
  const clientId = getActiveClientId();
  let query = supabase.from('social_accounts').select('*').order('platform');
  if (clientId) query = query.eq('client_id', clientId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function disconnectSocialAccount(id) {
  const { error } = await supabase.from('social_accounts').delete().eq('id', id);
  if (error) throw error;
}

export async function getCanvaConnection() {
  const clientId = getActiveClientId();
  let query = supabase.from('canva_connections').select('*');
  if (clientId) query = query.eq('client_id', clientId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function disconnectCanva() {
  const clientId = getActiveClientId();
  let query = supabase.from('canva_connections').delete();
  if (clientId) query = query.eq('client_id', clientId);
  const { error } = await query;
  if (error) throw error;
}

export async function uploadMediaFile(postId, file, sortOrder = 0) {
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
    sort_order: sortOrder,
  });
}

export async function updateApprovalStatus(postId, approvalStatus) {
  const post = await updatePost(postId, { approval_status: approvalStatus });
  await logPostActivity(postId, 'approval', `Status changed to ${approvalStatus}`);
  return post;
}

export async function submitForReview(postId) {
  const post = await getPost(postId);
  if (post.status !== 'draft') {
    throw new Error('Only draft posts can be submitted for review');
  }
  return updateApprovalStatus(postId, 'pending');
}

export async function listPostComments(postId, { teamView = true } = {}) {
  let query = supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (!teamView) query = query.eq('visibility', 'client');
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function addPostComment(postId, body, visibility = 'internal') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: user.id, body, visibility })
    .select()
    .single();
  if (error) throw error;
  await logPostActivity(postId, 'comment', visibility === 'internal' ? 'Added internal comment' : 'Added comment');
  return data;
}

export async function logPostActivity(postId, action, detail) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('post_activity').insert({
    post_id: postId,
    user_id: user?.id,
    action,
    detail,
  });
}

export async function listPostActivity(postId) {
  const { data, error } = await supabase
    .from('post_activity')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createReviewLink(postId) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('post_review_tokens')
    .insert({
      post_id: postId,
      token,
      expires_at: expiresAt,
      created_by: user?.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPostByReviewToken(token) {
  const { data: row, error } = await supabase
    .from('post_review_tokens')
    .select('*, posts(*, post_media(*))')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .is('used_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error('Invalid or expired review link');
  return { token: row, post: row.posts };
}

export async function submitReviewByToken(token, { action, comment }) {
  const { post } = await getPostByReviewToken(token);
  if (comment) {
    await supabase.from('post_comments').insert({
      post_id: post.id,
      user_id: null,
      body: comment,
      visibility: 'client',
    });
  }
  const approvalStatus = action === 'approve' ? 'approved' : 'changes_requested';
  await supabase.from('posts').update({ approval_status: approvalStatus }).eq('id', post.id);
  await supabase.from('post_review_tokens').update({ used_at: new Date().toISOString() }).eq('token', token);
  await logPostActivity(post.id, 'review_link', `Review link: ${action}`);
  return post;
}
