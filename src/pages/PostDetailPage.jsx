import { useRef, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS, truncateForTitle } from '@/lib/pageMeta';
import { ArrowLeft, Check, Copy, Link2, Loader2, Pencil, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import {
  getPost,
  deletePost,
  duplicatePost,
  updateApprovalStatus,
  updatePost,
  schedulePost,
  unschedulePost,
  listPostActivity,
  createReviewLink,
  logPostActivity,
  listSocialAccounts,
} from '@/lib/posts';
import { resolvePostAccounts, findAccountById } from '@/lib/socialAccounts';
import { listOrganizationMembers, displayMember } from '@/lib/organization';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { PlatformPreviewTabs } from '@/features/posts/previews/PlatformPreviewTabs';
import { normalizeMediaList } from '@/features/posts/previews/mediaUtils';
import { PostStatusBadges, canTransitionApproval } from '@/features/queue/postStatus';
import { CommentThread } from '@/features/queue/CommentThread';
import { PostActivityCard } from '@/features/posts/PostActivityCard';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatScheduledLabel } from '@/lib/scheduleTime';
import { PostNavigation } from '@/features/posts/PostNavigation';
import { usePostNavigation } from '@/features/posts/usePostNavigation';
import { useFocusedPostPolling } from '@/lib/useLivePosts';
import { showToast } from '@/lib/toast';
import { notifyWorkflowEvent, getPostAuthorUserIds } from '@/lib/profile';
import { useMembership } from '@/lib/membershipContext';
import { useClient } from '@/lib/clientContext';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { hasCreativesQaAccess } from '@/lib/clientRoles';
import { getEffectivePublishStatus } from '@/lib/publishStatus';
import { PostSchedulePanel } from '@/features/review/PostSchedulePanel';
import { DEVICE_TIERS, resolveTierAppPath, useDeviceTier } from '@/lib/deviceTier';
import { buildPostEditPath, isPostEditRoute } from '@/features/posts/postNavUtils';
import EditPostPage from '@/pages/EditPostPage';

const APPROVAL_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'changes_requested', label: 'Changes requested' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Pending publish' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
];

const QA_PUBLISH_OPTIONS = [
  { value: 'draft', label: 'Pending publish' },
  { value: 'scheduled', label: 'Scheduled' },
];

const PUBLISH_STATE_HINTS = {
  draft: 'Planned but not queued to publish. Click Schedule in the composer to go live.',
  scheduled: 'Queued to publish at the scheduled time.',
  published: 'Already live on connected platforms.',
  failed: 'Publish attempt failed — retry or edit.',
};

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tier = useDeviceTier();
  const listPath = resolveTierAppPath('/app/calendar', tier);
  const backLabel = tier === DEVICE_TIERS.MOBILE ? 'Back to queue' : 'Back to calendar';
  const backDescription = tier === DEVICE_TIERS.MOBILE ? 'Return to the approval queue' : 'Return to the content calendar';
  const queryClient = useQueryClient();
  const [duplicating, setDuplicating] = useState(false);
  const duplicateLockRef = useRef(false);
  const membership = useMembership();
  const { activeClient } = useClient();
  const { workspace } = useWorkspace();
  const readOnly = membership.isClientOnly;
  const canApprove = hasCreativesQaAccess(membership);
  const canSchedule = canApprove;

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPost(id),
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['post-activity', id],
    queryFn: () => listPostActivity(id, { clientView: readOnly }),
    enabled: !!id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: listOrganizationMembers,
  });

  const { data: socialAccounts = [] } = useQuery({
    queryKey: ['social-accounts', post?.client_id],
    queryFn: () => listSocialAccounts({ clientId: post.client_id }),
    enabled: !!post?.client_id,
  });

  const postNav = usePostNavigation(id);

  useFocusedPostPolling(id, { enabled: !!id });

  const goToEdit = useCallback(() => {
    const target = buildPostEditPath(id, postNav.navSearch);
    flushSync(() => {
      navigate(target);
    });
  }, [id, navigate, postNav.navSearch]);

  const goBack = useCallback(() => {
    navigate(listPath);
  }, [listPath, navigate]);

  useDocumentMeta({
    title: post ? truncateForTitle(post.internal_name || 'Post detail') : 'Post detail',
    description: PAGE_DESCRIPTIONS.postDetail,
  });

  if (isPostEditRoute(location.pathname, id)) {
    return <EditPostPage />;
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!post) return <p className="text-destructive">Post not found</p>;

  const mediaItems = normalizeMediaList(post.post_media || []);
  const hasArchivedMedia = (post.post_media || []).some((item) => item.archived_at);
  const approval = post.approval_status || 'draft';
  const overrides = post.platform_overrides || {};
  const { facebook: resolvedFb, instagram: resolvedIg } = resolvePostAccounts(post, socialAccounts);

  const accountLabel = (account, platform) => {
    if (!account) return 'Not set';
    return platform === 'instagram'
      ? `@${account.username || account.name}`
      : account.name;
  };

  const targetAccountLabel = (target) => {
    const fromTarget = findAccountById(socialAccounts, target.social_account_id, target.platform);
    if (fromTarget) return accountLabel(fromTarget, target.platform);
    if (target.platform === 'facebook') return accountLabel(resolvedFb, 'facebook');
    return accountLabel(resolvedIg, 'instagram');
  };

  const handleDelete = () => {
    showToast({
      toastId: `delete-post-${id}`,
      title: 'Delete this post?',
      description: 'This permanently removes the post and cannot be undone.',
      variant: 'error',
      duration: 0,
      actions: [
        {
          label: 'Delete',
          variant: 'destructive',
          onClick: async () => {
            try {
              await deletePost(id);
              await queryClient.invalidateQueries({ queryKey: ['posts'] });
              showToast({
                title: 'Post deleted',
                description: 'Returning to the calendar.',
                variant: 'success',
              });
              navigate(listPath);
            } catch (err) {
              showToast({
                title: 'Could not delete post',
                description: err.message,
                variant: 'error',
              });
            }
          },
        },
        { label: 'Cancel', variant: 'outline' },
      ],
    });
  };

  const handleDuplicate = async () => {
    if (duplicateLockRef.current || duplicating) return;
    duplicateLockRef.current = true;
    setDuplicating(true);
    try {
      const copy = await duplicatePost(id);
      queryClient.setQueryData(['post', copy.id], copy);
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      const scheduleLabel = copy.scheduled_at
        ? formatScheduledLabel(copy.scheduled_at, copy.schedule_timezone)
        : null;
      showToast({
        title: 'Post duplicated',
        description: scheduleLabel
          ? `Draft copy created with the same schedule (${scheduleLabel}).`
          : 'Draft copy created.',
        variant: 'success',
        duration: 8000,
        actions: [{
          label: 'Open copy',
          onClick: () => {
            window.location.assign(`/app/posts/${copy.id}/edit`);
          },
        }],
      });
    } catch (err) {
      showToast({
        title: 'Could not duplicate post',
        description: err.message,
        variant: 'error',
      });
    } finally {
      duplicateLockRef.current = false;
      setDuplicating(false);
    }
  };

  const handleRetry = async () => {
    await invokeFunction('publishPost', { postId: id });
    queryClient.invalidateQueries({ queryKey: ['post', id] });
  };

  const handleApprove = async () => {
    if (!canTransitionApproval(approval, 'approved')) return;
    await updateApprovalStatus(id, 'approved');
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    showToast({ title: 'Post approved', variant: 'success' });
    notifyWorkflowEvent({
      event: 'approved',
      postId: id,
      recipientUserIds: getPostAuthorUserIds(post),
    }).catch(() => {});
  };

  const handleResubmit = async () => {
    if (!canTransitionApproval(approval, 'pending')) return;
    await updateApprovalStatus(id, 'pending');
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    navigate('/app/queue');
  };

  const handleApprovalChange = async (value) => {
    await updateApprovalStatus(id, value);
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    queryClient.invalidateQueries({ queryKey: ['post-activity', id] });
  };

  const handleStatusChange = async (value) => {
    if (value === 'scheduled') {
      if (!post.scheduled_at) {
        showToast({
          title: 'Schedule time required',
          description: 'Edit the post and set a publish time before marking it scheduled.',
          variant: 'error',
        });
        return;
      }
      await schedulePost(id, post.scheduled_at);
    } else if (value === 'draft' && post.status === 'scheduled') {
      await unschedulePost(id);
    } else {
      await updatePost(id, { status: value });
      await logPostActivity(id, 'status', `Publish state changed to ${value}`);
    }
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    queryClient.invalidateQueries({ queryKey: ['post-activity', id] });
  };

  const handleAssigneeChange = async (userId) => {
    await updatePost(id, { assigned_to: userId || null });
    await logPostActivity(id, 'assignee', userId ? 'Assignee updated' : 'Assignee cleared');
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    queryClient.invalidateQueries({ queryKey: ['post-activity', id] });
  };

  const handleCopyReviewLink = async () => {
    const row = await createReviewLink(id);
    const link = `${window.location.origin}/review/${row.token}`;
    await navigator.clipboard.writeText(link);
    showToast({ title: 'Review link copied', variant: 'success' });
  };

  const invalidatePost = () => {
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    queryClient.invalidateQueries({ queryKey: ['post-activity', id] });
  };

  const publishStatus = getEffectivePublishStatus(post);
  const qaCanManagePublish = canSchedule
    && approval === 'approved'
    && !['published', 'publishing'].includes(post.status);

  const scheduleSummary = [];
  if (post.publish_facebook) {
    const at = overrides.facebook?.scheduled_at || post.scheduled_at;
    scheduleSummary.push({ platform: 'Facebook', at });
  }
  if (post.publish_instagram) {
    const at = overrides.instagram?.scheduled_at || post.scheduled_at;
    scheduleSummary.push({ platform: 'Instagram', at });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Post</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-bold">
              {post.internal_name || 'Post Detail'}
            </h2>
            <PostStatusBadges post={post} />
          </div>
          {post.label && (
            <p className="text-sm text-muted-foreground">Label: {post.label}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <PostNavigation
            prevHref={postNav.prevHref}
            nextHref={postNav.nextHref}
            position={postNav.position}
            total={postNav.total}
          />
          <div className="flex items-center gap-1">
          {canApprove && approval === 'pending' && (
            <IconTooltip title="Approve" description="Mark this post as approved">
              <Button size="icon" onClick={handleApprove} aria-label="Approve">
                <Check className="h-4 w-4" />
              </Button>
            </IconTooltip>
          )}
          {!readOnly && approval === 'changes_requested' && (
            <IconTooltip title="Resubmit for review" description="Send back to the approval queue">
              <Button size="icon" variant="secondary" onClick={handleResubmit} aria-label="Resubmit for review">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </IconTooltip>
          )}
          {!readOnly && post.status === 'failed' && (
            <IconTooltip title="Try again" description="Retry publishing this post">
              <Button size="icon" variant="secondary" onClick={handleRetry} aria-label="Try again">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </IconTooltip>
          )}
          {!readOnly && (
            <>
              <IconTooltip title="Duplicate post" description="Create a copy as a new draft">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleDuplicate}
                  disabled={duplicating}
                  aria-label="Duplicate post"
                  aria-busy={duplicating}
                >
                  {duplicating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </IconTooltip>
              <IconTooltip title="Copy review link" description="Share a link for external approval">
                <Button size="icon" variant="outline" onClick={handleCopyReviewLink} aria-label="Copy review link">
                  <Link2 className="h-4 w-4" />
                </Button>
              </IconTooltip>
            </>
          )}
          {post.status !== 'published' && (!readOnly || canSchedule) && (
            <IconTooltip
              title={canSchedule && readOnly ? 'Schedule post' : 'Edit post'}
              description={canSchedule && readOnly ? 'Pick a schedule time and queue for publishing' : 'Open in the composer to edit'}
            >
              <Button
                size="icon"
                variant="outline"
                type="button"
                aria-label={canSchedule && readOnly ? 'Schedule post' : 'Edit post'}
                onClick={goToEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </IconTooltip>
          )}
          {!readOnly && (
            <IconTooltip title="Delete" description="Permanently remove this post">
              <Button size="icon" variant="destructive" onClick={handleDelete} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </IconTooltip>
          )}
          <IconTooltip title={backLabel} description={backDescription}>
            <Button
              size="icon"
              variant="outline"
              aria-label={backLabel}
              onClick={goBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </IconTooltip>
          </div>
        </div>
      </div>

      {post.error_message && (
        <div className="rounded-hyve-md bg-[#FCE4E3] p-4 text-sm text-[#A62E2B]">
          That post didn&apos;t make it out — {post.error_message}
        </div>
      )}

      {approval === 'changes_requested' && (
        <div className="rounded-hyve-md border border-status-changes bg-[#FCEBEA] p-4 text-sm text-[#A62E2B]">
          Changes were requested. Review the feedback below, update your post, then resubmit.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{readOnly && !canSchedule ? 'Status' : readOnly ? 'Status & scheduling' : 'Workflow'}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {readOnly && !canSchedule ? (
                <div className="sm:col-span-2 space-y-2 text-sm">
                  <p><span className="font-medium">Approval:</span> {APPROVAL_OPTIONS.find((o) => o.value === approval)?.label || approval}</p>
                  <p><span className="font-medium">Publish state:</span> {STATUS_OPTIONS.find((o) => o.value === publishStatus)?.label || publishStatus}</p>
                </div>
              ) : readOnly && canSchedule ? (
                <>
                  <div className="sm:col-span-2 space-y-2 text-sm">
                    <p><span className="font-medium">Approval:</span> {APPROVAL_OPTIONS.find((o) => o.value === approval)?.label || approval}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium">Publish state</label>
                    <select
                      value={publishStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={!qaCanManagePublish}
                      className="h-10 w-full rounded-hyve-sm border border-input bg-background px-3 text-sm disabled:opacity-60"
                    >
                      {QA_PUBLISH_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {PUBLISH_STATE_HINTS[publishStatus] || PUBLISH_STATE_HINTS.draft}
                    </p>
                  </div>
                  {qaCanManagePublish && (
                    <div className="sm:col-span-2 border-t border-neutral-200 pt-4">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Scheduling for publishing
                      </p>
                      <PostSchedulePanel
                        post={post}
                        clientTimezone={activeClient?.default_timezone}
                        workspaceTimezone={workspace?.default_timezone}
                        onUpdated={invalidatePost}
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
              <div>
                <label className="mb-1 block text-xs font-medium">Approval state</label>
                <select
                  value={approval}
                  onChange={(e) => handleApprovalChange(e.target.value)}
                  className="h-10 w-full rounded-hyve-sm border border-input bg-background px-3 text-sm"
                >
                  {APPROVAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Publish state</label>
                <select
                  value={post.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="h-10 w-full rounded-hyve-sm border border-input bg-background px-3 text-sm"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {PUBLISH_STATE_HINTS[post.status] || PUBLISH_STATE_HINTS.draft}
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium">Assigned to</label>
                <select
                  value={post.assigned_to || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value || null)}
                  className="h-10 w-full rounded-hyve-sm border border-input bg-background px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {displayMember(m)} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
                </>
              )}
            </CardContent>
          </Card>

          {scheduleSummary.length > 0 && (
            <div className="rounded-hyve-md bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-medium">Scheduling</p>
              <ul className="mt-1 space-y-0.5">
                {scheduleSummary.map(({ platform, at }) => (
                  <li key={platform}>
                    {platform}:{' '}
                    {at
                      ? formatScheduledLabel(at, post.schedule_timezone)
                      : 'Not set'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap">{post.caption || '(no caption)'}</p>
              {post.first_comment && (
                <p className="text-sm text-muted-foreground">
                  First comment: {post.first_comment}
                </p>
              )}
              {mediaItems.length > 0 && (
                <div className="space-y-2">
                  {hasArchivedMedia && (
                    <Badge variant="secondary">Archived preview</Badge>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {mediaItems.map((item, i) => (
                      item.mime_type?.startsWith('video') ? (
                        <video key={i} src={item.public_url} className="h-20 w-20 rounded object-cover" muted />
                      ) : (
                        <img key={i} src={item.public_url} alt="" className="h-20 w-20 rounded object-cover" />
                      )
                    ))}
                  </div>
                </div>
              )}
              {(post.publish_facebook || post.publish_instagram) && (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Publish accounts</p>
                  {post.publish_facebook && (
                    <p className="text-muted-foreground">
                      Facebook: {accountLabel(resolvedFb, 'facebook')}
                    </p>
                  )}
                  {post.publish_instagram && (
                    <p className="text-muted-foreground">
                      Instagram: {accountLabel(resolvedIg, 'instagram')}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">Platform Results</p>
                {(post.post_targets || []).map((target) => (
                  <div key={target.id} className="flex flex-wrap items-center gap-2 rounded-hyve-sm border p-2 text-sm">
                    <span className="capitalize">{target.platform}</span>
                    <span className="text-muted-foreground">{targetAccountLabel(target)}</span>
                    <Badge variant={target.status}>{target.status}</Badge>
                    {target.permalink && target.status === 'published' && (
                      <a
                        href={target.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-honey-dark underline"
                      >
                        View on {target.platform}
                      </a>
                    )}
                    {target.error_message && (
                      <span className="text-xs text-red-600">{target.error_message}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <PostActivityCard activity={activity} />

          <Card>
            <CardContent className="pt-6">
              <CommentThread postId={id} teamView={!readOnly} readOnly={readOnly} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <PlatformPreviewTabs
            caption={post.caption}
            media={mediaItems}
            scheduledAt={post.scheduled_at}
            scheduleTimezone={post.schedule_timezone}
            publishFacebook={post.publish_facebook}
            publishInstagram={post.publish_instagram}
            facebookAccountId={post.facebook_account_id}
            instagramAccountId={post.instagram_account_id}
            clientId={post.client_id}
            currentPostId={post.id}
            facebookCaption={overrides.facebook?.caption}
            instagramCaption={overrides.instagram?.caption}
          />
        </div>
      </div>
    </div>
  );
}
