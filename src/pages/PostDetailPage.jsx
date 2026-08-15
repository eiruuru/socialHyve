import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Link2, Pencil, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import {
  getPost,
  deletePost,
  updateApprovalStatus,
  updatePost,
  listPostActivity,
  createReviewLink,
  logPostActivity,
} from '@/lib/posts';
import { listOrganizationMembers, displayMember } from '@/lib/organization';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { PlatformPreviewTabs } from '@/features/posts/previews/PlatformPreviewTabs';
import { normalizeMediaList } from '@/features/posts/previews/mediaUtils';
import { PostStatusBadges, canTransitionApproval } from '@/features/queue/postStatus';
import { CommentThread } from '@/features/queue/CommentThread';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatScheduledLabel } from '@/lib/scheduleTime';

const APPROVAL_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'changes_requested', label: 'Changes requested' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
];

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPost(id),
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['post-activity', id],
    queryFn: () => listPostActivity(id),
    enabled: !!id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: listOrganizationMembers,
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!post) return <p className="text-destructive">Post not found</p>;

  const mediaItems = normalizeMediaList(post.post_media || []);
  const hasArchivedMedia = (post.post_media || []).some((item) => item.archived_at);
  const approval = post.approval_status || 'draft';
  const overrides = post.platform_overrides || {};

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    await deletePost(id);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    navigate('/app/calendar');
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
    await updatePost(id, { status: value });
    await logPostActivity(id, 'status', `Status changed to ${value}`);
    queryClient.invalidateQueries({ queryKey: ['post', id] });
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
    alert('Review link copied to clipboard');
  };

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
        <div className="flex items-center gap-1">
          {approval === 'pending' && (
            <IconTooltip title="Approve" description="Mark this post as approved">
              <Button size="icon" onClick={handleApprove} aria-label="Approve">
                <Check className="h-4 w-4" />
              </Button>
            </IconTooltip>
          )}
          {approval === 'changes_requested' && (
            <IconTooltip title="Resubmit for review" description="Send back to the approval queue">
              <Button size="icon" variant="secondary" onClick={handleResubmit} aria-label="Resubmit for review">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </IconTooltip>
          )}
          {post.status === 'failed' && (
            <IconTooltip title="Try again" description="Retry publishing this post">
              <Button size="icon" variant="secondary" onClick={handleRetry} aria-label="Try again">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </IconTooltip>
          )}
          <IconTooltip title="Copy review link" description="Share a link for external approval">
            <Button size="icon" variant="outline" onClick={handleCopyReviewLink} aria-label="Copy review link">
              <Link2 className="h-4 w-4" />
            </Button>
          </IconTooltip>
          {post.status !== 'published' && (
            <IconTooltip title="Edit post" description="Open in the composer to edit">
              <Button size="icon" variant="outline" asChild aria-label="Edit post">
                <Link to={`/app/posts/${id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            </IconTooltip>
          )}
          <IconTooltip title="Delete" description="Permanently remove this post">
            <Button size="icon" variant="destructive" onClick={handleDelete} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </IconTooltip>
          <IconTooltip title="Back to calendar" description="Return to the content calendar">
            <Button size="icon" variant="outline" asChild aria-label="Back to calendar">
              <Link to="/app/calendar">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </IconTooltip>
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
              <CardTitle>Workflow</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <p className="text-sm font-medium">Platform Results</p>
                {(post.post_targets || []).map((target) => (
                  <div key={target.id} className="flex flex-wrap items-center gap-2 rounded-hyve-sm border p-2 text-sm">
                    <span className="capitalize">{target.platform}</span>
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

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-2">
                  {activity.map((a) => (
                    <li key={a.id} className="text-sm">
                      <span className="text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                      {' — '}
                      {a.detail || a.action}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <CommentThread postId={id} />
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
