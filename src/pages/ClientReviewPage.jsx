import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { listPosts, updateApprovalStatus, addPostComment, listPostActivity } from '@/lib/posts';
import { getEffectivePublishStatus } from '@/lib/publishStatus';
import { PostActivityCard } from '@/features/posts/PostActivityCard';
import { notifyWorkflowEvent, getPostAuthorUserIds } from '@/lib/profile';
import { PlatformPreviewTabs } from '@/features/posts/previews/PlatformPreviewTabs';
import { normalizeMediaList } from '@/features/posts/previews/mediaUtils';
import { ReviewPostSelector } from '@/features/review/ReviewPostSelector';
import { PostSchedulePanel } from '@/features/review/PostSchedulePanel';
import { CommentThread } from '@/features/queue/CommentThread';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useClient } from '@/lib/clientContext';
import { showToast } from '@/lib/toast';

function filterApprovalPosts(posts) {
  return posts.filter((p) => ['pending', 'changes_requested'].includes(p.approval_status));
}

function filterSchedulingPosts(posts) {
  return posts.filter((p) =>
    p.approval_status === 'approved'
    && !['published', 'publishing'].includes(p.status),
  );
}

export default function ClientReviewPage() {
  useDocumentMeta({ title: 'Review posts', description: PAGE_DESCRIPTIONS.clientReview });
  const { clientId } = useParams();
  const queryClient = useQueryClient();
  const { activeClient } = useClient();
  const [tab, setTab] = useState('approval');
  const [approvalSelectedId, setApprovalSelectedId] = useState(null);
  const [scheduleSelectedId, setScheduleSelectedId] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: allPosts = [], isLoading } = useQuery({
    queryKey: ['client-review', clientId],
    queryFn: () => listPosts({ clientId }),
    enabled: !!clientId,
  });

  const approvalPosts = filterApprovalPosts(allPosts);
  const schedulingPosts = filterSchedulingPosts(allPosts);

  const approvalSelected = approvalPosts.find((p) => p.id === approvalSelectedId) || approvalPosts[0];
  const scheduleSelected = schedulingPosts.find((p) => p.id === scheduleSelectedId) || schedulingPosts[0];

  const { data: approvalActivity = [] } = useQuery({
    queryKey: ['post-activity', approvalSelected?.id, 'client'],
    queryFn: () => listPostActivity(approvalSelected.id, { clientView: true }),
    enabled: !!approvalSelected?.id && tab === 'approval',
  });

  const { data: scheduleActivity = [] } = useQuery({
    queryKey: ['post-activity', scheduleSelected?.id, 'client-schedule'],
    queryFn: () => listPostActivity(scheduleSelected.id, { clientView: true }),
    enabled: !!scheduleSelected?.id && tab === 'scheduling',
  });

  const handleApprovalAction = async (action) => {
    if (!approvalSelected) return;
    if (action === 'changes_requested' && !comment.trim()) {
      showToast({
        title: 'Comment required',
        description: 'Please explain what needs to change.',
        variant: 'error',
      });
      return;
    }
    setSubmitting(true);
    const currentIndex = approvalPosts.findIndex((p) => p.id === approvalSelected.id);
    try {
      if (comment.trim()) {
        await addPostComment(approvalSelected.id, comment.trim(), 'client');
      }
      await updateApprovalStatus(
        approvalSelected.id,
        action === 'approve' ? 'approved' : 'changes_requested',
      );
      notifyWorkflowEvent({
        event: action === 'approve' ? 'approved' : 'changes_requested',
        postId: approvalSelected.id,
        recipientUserIds: getPostAuthorUserIds(approvalSelected),
        postTitle: approvalSelected.internal_name || approvalSelected.caption?.slice(0, 80),
        href: `/app/posts/${approvalSelected.id}`,
      }).catch(() => {});
      setComment('');
      await queryClient.invalidateQueries({ queryKey: ['client-review', clientId] });
      await queryClient.invalidateQueries({ queryKey: ['post-activity', approvalSelected.id] });
      const remaining = approvalPosts.filter((p) => p.id !== approvalSelected.id);
      if (remaining.length > 0) {
        const next = remaining[Math.min(currentIndex, remaining.length - 1)];
        setApprovalSelectedId(next.id);
      } else {
        setApprovalSelectedId(null);
        if (action === 'approve') {
          setTab('scheduling');
        }
      }
      showToast({
        title: action === 'approve' ? 'Post approved' : 'Changes requested',
        variant: 'success',
      });
    } catch (err) {
      showToast({ title: 'Action failed', description: err.message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const invalidateSchedule = async () => {
    await queryClient.invalidateQueries({ queryKey: ['client-review', clientId] });
    if (scheduleSelected?.id) {
      await queryClient.invalidateQueries({ queryKey: ['post-activity', scheduleSelected.id] });
    }
  };

  if (isLoading) return <p className="text-muted-foreground">Loading review queue…</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Client portal</p>
        <h2 className="font-display text-2xl font-bold">Review posts</h2>
        <p className="text-muted-foreground">Approve content, then queue approved posts for publishing</p>
      </div>

      <TabsRoot value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="approval">
            Approval for content{approvalPosts.length ? ` (${approvalPosts.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="scheduling">
            Scheduling for publishing{schedulingPosts.length ? ` (${schedulingPosts.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approval" className="mt-6 space-y-6">
          {approvalPosts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nothing waiting for content approval right now.
              </CardContent>
            </Card>
          ) : (
            <>
              <ReviewPostSelector
                posts={approvalPosts}
                selectedId={approvalSelected?.id}
                onSelect={setApprovalSelectedId}
              />

              {approvalSelected && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Approval for content</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Textarea
                          placeholder="Comment (required when requesting edits)…"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => handleApprovalAction('approve')} disabled={submitting}>
                            Approve content
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleApprovalAction('changes_requested')}
                            disabled={submitting}
                          >
                            Require edits
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    <PostActivityCard activity={approvalActivity} />
                    <Card>
                      <CardContent className="pt-6">
                        <CommentThread postId={approvalSelected.id} teamView={false} readOnly />
                      </CardContent>
                    </Card>
                  </div>
                  <div>
                    <PlatformPreviewTabs
                      caption={approvalSelected.caption}
                      media={normalizeMediaList(approvalSelected.post_media || [])}
                      scheduledAt={approvalSelected.scheduled_at}
                      publishFacebook={approvalSelected.publish_facebook}
                      publishInstagram={approvalSelected.publish_instagram}
                      clientId={clientId}
                      currentPostId={approvalSelected.id}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="scheduling" className="mt-6 space-y-6">
          {schedulingPosts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No approved posts ready to schedule. Approve content first, then queue posts here.
              </CardContent>
            </Card>
          ) : (
            <>
              <ReviewPostSelector
                posts={schedulingPosts}
                selectedId={scheduleSelected?.id}
                onSelect={setScheduleSelectedId}
              />

              {scheduleSelected && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Scheduling for publishing</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-sm">
                          <p>
                            <span className="font-medium">Publish state:</span>{' '}
                            {getEffectivePublishStatus(scheduleSelected) === 'scheduled'
                              ? 'Scheduled'
                              : 'Pending publish'}
                          </p>
                        </div>
                        <PostSchedulePanel
                          post={scheduleSelected}
                          clientTimezone={activeClient?.default_timezone}
                          onUpdated={invalidateSchedule}
                        />
                      </CardContent>
                    </Card>
                    <PostActivityCard activity={scheduleActivity} />
                  </div>
                  <div>
                    <PlatformPreviewTabs
                      caption={scheduleSelected.caption}
                      media={normalizeMediaList(scheduleSelected.post_media || [])}
                      scheduledAt={scheduleSelected.scheduled_at}
                      scheduleTimezone={scheduleSelected.schedule_timezone}
                      publishFacebook={scheduleSelected.publish_facebook}
                      publishInstagram={scheduleSelected.publish_instagram}
                      clientId={clientId}
                      currentPostId={scheduleSelected.id}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </TabsRoot>
    </div>
  );
}
