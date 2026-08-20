import { supabase } from './supabase';
import { filterClientActivity } from '@/features/posts/postActivityUtils';
import { buildPostEntityLabel, logWorkspaceEvent } from '@/lib/workspaceEvents';
import { stampWorkspaceId, getCurrentWorkspaceId } from './workspace';
import { getActiveClientId } from './clientContext';
import { format } from 'date-fns';
import {
  formatScheduledLabel,
  isPastCalendarDay,
  isScheduleInPast,
  rescheduleUtcToDay,
  resolveScheduleTimezone,
} from './scheduleTime';
import { buildDuplicateMediaRows, buildDuplicatePayload } from './postDuplicate';
export {
  listSocialAccounts,
  setPrimarySocialAccount,
  disconnectSocialAccount,
  disconnectAllSocialAccounts,
  assignSocialAccountToClient,
  unassignSocialAccountFromClient,
  unassignAllSocialAccounts,
  listWorkspaceMetaSessions,
  listWorkspaceMetaPages,
  listUnassignedMetaPages,
  disconnectMetaSession,
} from './metaAccounts';

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
  const clientId = filters.clientId ?? getActiveClientId();
  let query = supabase
    .from('posts')
    .select('*, post_media(*), post_targets(*)')
    .order('scheduled_at', { ascending: true, nullsFirst: false });

  query = applyClientFilter(query, clientId);
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
  await logWorkspaceEvent({
    clientId: data.client_id,
    entityType: 'post',
    entityId: data.id,
    entityLabel: buildPostEntityLabel(data),
    action: 'created',
    detail: 'Post created',
  });
  return data;
}

export async function updatePost(id, updates) {
  const { data, error } = await supabase.from('posts').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStorageObject(storagePath) {
  if (!storagePath) return;
  const { error } = await supabase.storage.from('post-media').remove([storagePath]);
  if (error) throw error;
}

export async function deleteStorageObjects(storagePaths) {
  const paths = [...new Set(storagePaths.filter(Boolean))];
  if (!paths.length) return;
  const { error } = await supabase.storage.from('post-media').remove(paths);
  if (error) throw error;
}

export async function deletePost(id) {
  const post = await getPost(id);

  const { data: mediaRows, error: mediaErr } = await supabase
    .from('post_media')
    .select('storage_path, preview_storage_path, original_storage_path')
    .eq('post_id', id);
  if (mediaErr) throw mediaErr;

  await logWorkspaceEvent({
    organizationId: post.workspace_id,
    clientId: post.client_id,
    entityType: 'post',
    entityId: post.id,
    entityLabel: buildPostEntityLabel(post),
    action: 'deleted',
    detail: 'Post permanently deleted',
    metadata: {
      status: post.status,
      scheduled_at: post.scheduled_at,
      published_at: post.published_at,
    },
  });

  await deleteStorageObjects(
    (mediaRows || []).flatMap((row) => [
      row.storage_path,
      row.preview_storage_path,
      row.original_storage_path,
    ]),
  );

  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

export { buildDuplicatePayload, buildDuplicateMediaRows } from './postDuplicate';

export async function duplicatePost(sourceId) {
  const source = await getPost(sourceId);
  const copyPayload = buildDuplicatePayload(source);

  const copy = await createPost(copyPayload);
  const mediaRows = buildDuplicateMediaRows(source.post_media, copy.id);

  if (mediaRows.length) {
    const { error: mediaErr } = await supabase.from('post_media').insert(mediaRows);
    if (mediaErr) throw mediaErr;
  }

  await logPostActivity(copy.id, 'duplicated', `Duplicated from ${sourceId}`);

  return getPost(copy.id);
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
  const { data: row, error: fetchErr } = await supabase
    .from('post_media')
    .select('storage_path, preview_storage_path, original_storage_path')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  await deleteStorageObjects([
    row?.storage_path,
    row?.preview_storage_path,
    row?.original_storage_path,
  ]);

  const { error } = await supabase.from('post_media').delete().eq('id', id);
  if (error) throw error;
}

export async function schedulePost(postId, scheduledAt) {
  const post = await updatePost(postId, { status: 'scheduled', scheduled_at: scheduledAt });
  const scheduleLabel = formatScheduledLabel(scheduledAt, post.schedule_timezone);
  await logPostActivity(postId, 'scheduled', `Scheduled for ${scheduleLabel}`);
  await logWorkspaceEvent({
    clientId: post.client_id,
    entityType: 'post',
    entityId: postId,
    entityLabel: buildPostEntityLabel(post),
    action: 'scheduled',
    detail: `Scheduled for ${scheduleLabel}`,
    metadata: { scheduled_at: scheduledAt },
  });
  await supabase.from('publish_jobs').upsert({
    post_id: postId,
    attempts: 0,
    next_run_at: scheduledAt,
    last_error: null,
  }, { onConflict: 'post_id' });
  return post;
}

export async function unschedulePost(postId) {
  const post = await updatePost(postId, { status: 'draft', scheduled_at: null });
  await supabase.from('publish_jobs').delete().eq('post_id', postId);
  await logPostActivity(postId, 'unscheduled', 'Removed from publish queue');
  await logWorkspaceEvent({
    clientId: post.client_id,
    entityType: 'post',
    entityId: postId,
    entityLabel: buildPostEntityLabel(post),
    action: 'unscheduled',
    detail: 'Removed from publish queue',
  });
  return post;
}

export async function reschedulePostToDay(postId, targetDay, post, clientTimezone) {
  if (isPastCalendarDay(targetDay)) {
    throw new Error('Cannot reschedule to a date in the past');
  }

  const timeZone = resolveScheduleTimezone({
    postTimezone: post.schedule_timezone,
    clientTimezone,
  });
  const scheduledAt = rescheduleUtcToDay(post.scheduled_at, timeZone, targetDay);
  if (!scheduledAt) throw new Error('Could not compute new schedule time');
  if (isScheduleInPast(scheduledAt)) {
    throw new Error('Cannot reschedule to a time in the past');
  }

  const updated = await updatePost(postId, { scheduled_at: scheduledAt });
  await logPostActivity(
    postId,
    'rescheduled',
    `Rescheduled to ${format(targetDay, 'MMM d, yyyy')}`,
  );
  await logWorkspaceEvent({
    clientId: post.client_id,
    entityType: 'post',
    entityId: postId,
    entityLabel: buildPostEntityLabel(post),
    action: 'rescheduled',
    detail: `Rescheduled to ${format(targetDay, 'MMM d, yyyy')}`,
    metadata: { scheduled_at: scheduledAt },
  });

  if (post.status === 'scheduled') {
    await supabase.from('publish_jobs').upsert({
      post_id: postId,
      attempts: 0,
      next_run_at: scheduledAt,
      last_error: null,
    }, { onConflict: 'post_id' });
  }

  return updated;
}

export async function getCanvaConnection() {
  const clientId = getActiveClientId();
  if (!clientId) return null;

  const { data, error } = await supabase
    .from('canva_connections')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function disconnectCanva() {
  const clientId = getActiveClientId();
  if (!clientId) return;

  const { error } = await supabase
    .from('canva_connections')
    .delete()
    .eq('client_id', clientId);
  if (error) throw error;
}

export async function uploadDraftMediaFile(file) {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = getActiveClientId();
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const pathPrefix = clientId ? `${workspaceId}/${clientId}` : workspaceId;
  const path = `${pathPrefix}/draft/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('post-media')
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);
  return {
    storage_path: path,
    public_url: urlData.publicUrl,
    mime_type: file.type || 'application/octet-stream',
  };
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

export async function listPostActivity(postId, { clientView = false } = {}) {
  const { data, error } = await supabase
    .from('post_activity')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!clientView) return data || [];
  return filterClientActivity(data);
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
