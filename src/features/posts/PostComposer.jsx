import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPost,
  addPostMedia,
  schedulePost,
  unschedulePost,
  uploadMediaFile,
  updatePost,
  getPost,
  logPostActivity,
  removePostMedia,
  deleteStorageObject,
  listSocialAccounts,
} from '@/lib/posts';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { useClient } from '@/lib/clientContext';
import { useMembership } from '@/lib/membershipContext';
import { hasCreativesQaAccess } from '@/lib/clientRoles';
import { getOrganization, listWorkflowApproverUserIds } from '@/lib/organization';
import { notifyWorkflowEvent } from '@/lib/profile';
import { showToast } from '@/lib/toast';
import { getEffectivePublishStatus, resolvePublishStatus } from '@/lib/publishStatus';
import { validatePost, validatePublishPlatforms } from '@/features/posts/postValidation';
import { findLinkedInstagram, pickPrimaryAccount } from '@/lib/socialAccounts';
import {
  formatScheduledLabel,
  getBrowserTimezone,
  isScheduleInPast,
  resolveScheduleTimezone,
  utcToZonedLocalInput,
  zonedLocalToUtc,
} from '@/lib/scheduleTime';
import { GenericContentStep } from '@/features/posts/composer/GenericContentStep';
import { ComposerActionBar } from '@/features/posts/composer/ComposerActionBar';
import { Button } from '@/components/ui/button';
import {
  getPublishPlatformLabel,
  PublishProgressPanel,
} from '@/features/posts/composer/PublishProgressPanel';
import { FineTunePanel } from '@/features/posts/composer/FineTunePanel';
import { PlatformPreviewTabs } from '@/features/posts/previews/PlatformPreviewTabs';
import { MAX_CAROUSEL_ITEMS } from '@/features/posts/MediaStrip';
import { buildScheduleReturnPath, buildPostDetailPath } from '@/features/posts/postNavUtils';
import {
  getEffectiveCaption,
  IG_CAPTION_LIMIT,
  FB_CAPTION_LIMIT,
  validateFineTune,
} from '@/features/posts/platformOverrides';
import {
  DEVICE_TIERS,
  isSimplifiedComposerTier,
  useDeviceTier,
} from '@/lib/deviceTier';

export function PostComposer({ editPostId = null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const presetDate = searchParams.get('date');
  const navFrom = searchParams.get('nav') || undefined;
  const navTab = searchParams.get('tab') || undefined;
  const navMonth = searchParams.get('month') || undefined;
  const { activeClient } = useClient();
  const membership = useMembership();
  const tier = useDeviceTier();
  const simplifiedComposer = isSimplifiedComposerTier(tier);
  const showCanvaImport = membership.canUseCanva && tier !== DEVICE_TIERS.MOBILE;
  const { canManageTeam } = membership;
  const clientScheduleOnly = hasCreativesQaAccess(membership);
  const isEditMode = !!editPostId;
  const hydratedRef = useRef(false);
  const accountsInitializedRef = useRef(false);
  const igManuallySetRef = useRef(false);
  const originalMediaIdsRef = useRef([]);
  const trackedStoragePathsRef = useRef(new Set());

  const { data: existingPost, isLoading: loadingPost, isError, error, isFetched } = useQuery({
    queryKey: ['post', editPostId],
    queryFn: () => getPost(editPostId),
    enabled: isEditMode && !!editPostId,
    initialData: () => queryClient.getQueryData(['post', editPostId]),
  });

  const { data: socialAccounts = [] } = useQuery({
    queryKey: ['social-accounts', activeClient?.id],
    queryFn: () => listSocialAccounts({ clientId: activeClient.id }),
    enabled: !!activeClient?.id,
  });

  const { data: org } = useQuery({
    queryKey: ['organization'],
    queryFn: getOrganization,
  });

  const requireApproval = org?.require_approval_before_publish !== false;
  const canBypassApproval = canManageTeam || !requireApproval;
  const workspaceTimezone = org?.default_timezone || null;
  const workspaceLocale = org?.default_locale || null;
  const resolvedDefaultTimezone = activeClient?.default_timezone
    || workspaceTimezone
    || getBrowserTimezone();

  const fbAccounts = socialAccounts.filter((a) => a.platform === 'facebook');
  const igAccounts = socialAccounts.filter((a) => a.platform === 'instagram');

  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  const [draftPostId, setDraftPostId] = useState(editPostId);
  const [internalName, setInternalName] = useState('');
  const [label, setLabel] = useState('');
  const [caption, setCaption] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [platformOverrides, setPlatformOverrides] = useState({});
  const [publishFacebook, setPublishFacebook] = useState(true);
  const [publishInstagram, setPublishInstagram] = useState(true);
  const [facebookAccountId, setFacebookAccountId] = useState(null);
  const [instagramAccountId, setInstagramAccountId] = useState(null);
  const [scheduleTimezone, setScheduleTimezone] = useState(getBrowserTimezone());
  const [scheduledAt, setScheduledAt] = useState('');
  const [media, setMedia] = useState([]);
  const [saving, setSaving] = useState(false);
  const [publishProgress, setPublishProgress] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState('draft');

  useEffect(() => {
    if (!isEditMode) return;
    hydratedRef.current = false;
    accountsInitializedRef.current = false;
    igManuallySetRef.current = false;
    originalMediaIdsRef.current = [];
    trackedStoragePathsRef.current = new Set();
    setDraftPostId(editPostId);
    setInternalName('');
    setLabel('');
    setCaption('');
    setFirstComment('');
    setPlatformOverrides({});
    setMedia([]);
    setScheduledAt('');
    setApprovalStatus('draft');
  }, [editPostId, isEditMode]);

  useEffect(() => {
    if (isEditMode) return;
    setScheduleTimezone(resolvedDefaultTimezone);
  }, [activeClient?.id, activeClient?.default_timezone, workspaceTimezone, isEditMode, resolvedDefaultTimezone]);

  useEffect(() => {
    if (presetDate && !scheduledAt) {
      const tz = resolvedDefaultTimezone;
      const d = new Date(presetDate);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(12, 0, 0, 0);
        setScheduledAt(utcToZonedLocalInput(d.toISOString(), tz));
      }
    }
  }, [presetDate, resolvedDefaultTimezone, scheduledAt]);

  useEffect(() => {
    if (!existingPost || existingPost.id !== editPostId || hydratedRef.current) return;
    hydratedRef.current = true;
    const tz = resolveScheduleTimezone({
      postTimezone: existingPost.schedule_timezone,
      clientTimezone: activeClient?.default_timezone,
      workspaceTimezone,
    });
    setDraftPostId(existingPost.id);
    setInternalName(existingPost.internal_name || '');
    setLabel(existingPost.label || '');
    setCaption(existingPost.caption || '');
    setFirstComment(existingPost.first_comment || '');
    setPlatformOverrides(existingPost.platform_overrides || {});
    setPublishFacebook(existingPost.publish_facebook ?? false);
    setPublishInstagram(existingPost.publish_instagram ?? false);
    setFacebookAccountId(existingPost.facebook_account_id || null);
    setInstagramAccountId(existingPost.instagram_account_id || null);
    igManuallySetRef.current = Boolean(existingPost.instagram_account_id);
    setScheduleTimezone(tz);
    setScheduledAt(
      existingPost.scheduled_at ? utcToZonedLocalInput(existingPost.scheduled_at, tz) : '',
    );
    setApprovalStatus(existingPost.approval_status || 'draft');
    const sortedMedia = [...(existingPost.post_media || [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    originalMediaIdsRef.current = sortedMedia.map((m) => m.id);
    setMedia(sortedMedia.map((m, i) => ({
      id: m.id,
      source: m.source,
      canva_design_id: m.canva_design_id,
      storage_path: m.storage_path,
      public_url: m.public_url,
      mime_type: m.mime_type,
      sort_order: i,
    })));
    trackedStoragePathsRef.current = new Set(
      sortedMedia.map((m) => m.storage_path).filter(Boolean),
    );
  }, [existingPost, editPostId, activeClient?.default_timezone, workspaceTimezone]);

  useEffect(() => {
    accountsInitializedRef.current = false;
  }, [activeClient?.id]);

  useEffect(() => {
    if (!socialAccounts.length || accountsInitializedRef.current) return;
    accountsInitializedRef.current = true;
    const primaryFb = pickPrimaryAccount(socialAccounts, 'facebook');
    const primaryIg = pickPrimaryAccount(socialAccounts, 'instagram');
    if (isEditMode && existingPost) {
      setFacebookAccountId(existingPost.facebook_account_id || primaryFb?.id || null);
      setInstagramAccountId(existingPost.instagram_account_id || primaryIg?.id || null);
      return;
    }
    setFacebookAccountId(primaryFb?.id || null);
    setInstagramAccountId(primaryIg?.id || null);
  }, [socialAccounts, isEditMode, existingPost]);

  const handleFacebookAccountChange = (nextId) => {
    setFacebookAccountId(nextId);
    if (igManuallySetRef.current) return;
    const fb = fbAccounts.find((a) => a.id === nextId);
    const linked = findLinkedInstagram(igAccounts, fb);
    if (linked) setInstagramAccountId(linked.id);
  };

  const resolveAccountIdForPayload = (enabled, accountId, accounts) => {
    if (!enabled) return null;
    const primary = accounts.find((a) => a.is_primary) || accounts[0];
    if (accountId && accounts.some((a) => a.id === accountId)) return accountId;
    return primary?.id || null;
  };

  const isPublished = existingPost?.status === 'published';
  const isQueued = isEditMode && getEffectivePublishStatus(existingPost) === 'scheduled';
  const scheduledAtUtc = scheduledAt
    ? zonedLocalToUtc(scheduledAt, scheduleTimezone)
    : null;
  const draftFineTuneValidation = validateFineTune({
    caption,
    media,
    platformOverrides,
    publishFacebook,
    publishInstagram,
    scheduledAt: scheduledAtUtc || scheduledAt,
    firstComment,
    requireInstagramMedia: false,
  });
  const publishFineTuneValidation = validateFineTune({
    caption,
    media,
    platformOverrides,
    publishFacebook,
    publishInstagram,
    scheduledAt: scheduledAtUtc || scheduledAt,
    firstComment,
    requireInstagramMedia: true,
  });
  const draftValidationErrors = [
    ...validatePost({
      caption,
      media,
      publishInstagram,
      publishFacebook,
      requireInstagramMedia: false,
    }),
    ...draftFineTuneValidation.errors,
  ];
  const publishValidationErrors = [
    ...validatePublishPlatforms({ publishInstagram, publishFacebook }),
    ...validatePost({
      caption,
      media,
      publishInstagram,
      publishFacebook,
      requireInstagramMedia: true,
    }),
    ...publishFineTuneValidation.errors,
  ];
  const captionHint = publishInstagram
    ? `${caption.length}/${IG_CAPTION_LIMIT} (Instagram)`
    : `${caption.length}/${FB_CAPTION_LIMIT} (Facebook)`;

  const buildPayload = (requestedStatus, nextApprovalStatus = approvalStatus) => ({
    caption,
    internal_name: internalName || null,
    label: label || null,
    first_comment: firstComment || null,
    platform_overrides: platformOverrides,
    status: resolvePublishStatus({
      status: requestedStatus ?? existingPost?.status ?? 'draft',
      scheduled_at: scheduledAtUtc,
    }),
    approval_status: nextApprovalStatus,
    publish_facebook: publishFacebook,
    publish_instagram: publishInstagram,
    facebook_account_id: resolveAccountIdForPayload(publishFacebook, facebookAccountId, fbAccounts),
    instagram_account_id: resolveAccountIdForPayload(publishInstagram, instagramAccountId, igAccounts),
    schedule_timezone: scheduleTimezone,
    scheduled_at: scheduledAtUtc,
  });

  const syncMedia = async (postId, { onUploadProgress } = {}) => {
    const currentIds = new Set(media.filter((m) => m.id).map((m) => m.id));
    const currentPaths = new Set(media.filter((m) => m.storage_path).map((m) => m.storage_path));

    for (const id of originalMediaIdsRef.current) {
      if (!currentIds.has(id)) {
        await removePostMedia(id);
      }
    }

    const pendingUploads = media.filter((item) => item.file);
    for (let i = 0; i < pendingUploads.length; i += 1) {
      const item = pendingUploads[i];
      onUploadProgress?.({
        current: i,
        total: pendingUploads.length,
        fileName: item.file.name,
      });
      await uploadMediaFile(postId, item.file, item.sort_order);
      onUploadProgress?.({
        current: i + 1,
        total: pendingUploads.length,
        fileName: item.file.name,
      });
    }

    for (const item of media) {
      if (item.file) {
        continue;
      } else if (!item.id) {
        await addPostMedia(postId, {
          source: item.source,
          canva_design_id: item.canva_design_id,
          storage_path: item.storage_path,
          public_url: item.public_url,
          mime_type: item.mime_type,
          sort_order: item.sort_order,
        });
      }
    }

    originalMediaIdsRef.current = media.filter((m) => m.id).map((m) => m.id);
    for (const path of [...trackedStoragePathsRef.current]) {
      if (!currentPaths.has(path)) {
        await deleteStorageObject(path);
        trackedStoragePathsRef.current.delete(path);
      }
    }
    for (const path of currentPaths) {
      trackedStoragePathsRef.current.add(path);
    }
  };

  const handleMediaChange = (nextOrUpdater) => {
    setMedia((prev) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater;
      const nextPaths = new Set(next.filter((m) => m.storage_path).map((m) => m.storage_path));
      for (const item of prev) {
        if (item.storage_path && !item.id && !nextPaths.has(item.storage_path)) {
          void deleteStorageObject(item.storage_path);
          trackedStoragePathsRef.current.delete(item.storage_path);
        }
      }
      for (const path of nextPaths) {
        trackedStoragePathsRef.current.add(path);
      }
      return next;
    });
  };

  const ensureDraft = async (options = {}) => {
    if (draftPostId) {
      await updatePost(draftPostId, buildPayload(existingPost?.status || 'draft'));
      await syncMedia(draftPostId, options);
      return { id: draftPostId, created: false };
    }
    const post = await createPost(buildPayload('draft', 'draft'));
    await syncMedia(post.id, options);
    setDraftPostId(post.id);
    return { id: post.id, created: true };
  };

  const runWithValidation = async (action, errors) => {
    if (isPublished) {
      showToast({ title: 'Published posts cannot be edited', variant: 'error' });
      return;
    }
    if (errors.length) {
      showToast({ title: 'Fix validation errors', description: errors[0], variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      await action();
    } catch (err) {
      showToast({ title: 'Something went wrong', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () =>
    runWithValidation(async () => {
      const { id, created } = await ensureDraft();
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      showToast({
        title: created ? 'Post created' : 'Draft saved',
        description: created ? 'Your new draft is ready to edit.' : undefined,
        variant: 'success',
      });
      openPostDetail(id);
    }, draftValidationErrors);

  const handleSaveChanges = () =>
    runWithValidation(async () => {
      if (scheduledAtUtc && isScheduleInPast(scheduledAtUtc, { bufferMs: 10 * 60 * 1000 })) {
        showToast({
          title: 'Schedule in the past',
          description: 'Pick a time at least 10 minutes from now.',
          variant: 'error',
        });
        return;
      }
      const { id, created } = await ensureDraft();
      if (isEditMode) {
        await logPostActivity(id, 'updated', 'Post content updated');
      }
      if (existingPost?.status === 'scheduled' && scheduledAtUtc) {
        await schedulePost(id, scheduledAtUtc);
      } else if (existingPost?.status === 'scheduled' && !scheduledAtUtc) {
        await unschedulePost(id);
      }
      await queryClient.invalidateQueries({ queryKey: ['post', id] });
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      showToast({
        title: created ? 'Post created' : 'Changes saved',
        variant: 'success',
      });
    }, draftValidationErrors);

  const handleSchedule = () =>
    runWithValidation(async () => {
      if (approvalStatus !== 'approved' && requireApproval && !canManageTeam) {
        showToast({ title: 'Approval required', description: 'Submit for review and get approval before scheduling.', variant: 'info' });
        return;
      }
      if (!scheduledAt) {
        showToast({ title: 'Schedule time required', variant: 'error' });
        return;
      }
      if (!scheduledAtUtc) {
        showToast({ title: 'Invalid schedule time', variant: 'error' });
        return;
      }
      const scheduleDate = new Date(scheduledAtUtc);
      const minSchedule = new Date(Date.now() + 10 * 60 * 1000);
      if (scheduleDate < minSchedule) {
        showToast({ title: 'Schedule too soon', description: 'Pick a time at least 10 minutes from now.', variant: 'error' });
        return;
      }
      const { id } = await ensureDraft();
      await updatePost(id, buildPayload('scheduled'));
      await schedulePost(id, scheduledAtUtc);
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      await queryClient.invalidateQueries({ queryKey: ['post', id] });
      showToast({
        title: 'Post scheduled',
        description: formatScheduledLabel(scheduledAtUtc, scheduleTimezone, workspaceLocale),
        variant: 'success',
      });
      navigate(buildScheduleReturnPath({
        scheduledAtUtc,
        nav: navFrom,
        tab: navTab,
        month: navMonth,
        tier,
      }));
    }, publishValidationErrors);

  const handlePublishNow = async () => {
    if (isPublished) {
      showToast({ title: 'Published posts cannot be edited', variant: 'error' });
      return;
    }
    if (approvalStatus !== 'approved' && requireApproval && !canManageTeam) {
      showToast({ title: 'Approval required', description: 'Submit for review and get approval before publishing.', variant: 'info' });
      return;
    }
    if (publishValidationErrors.length) {
      showToast({ title: 'Fix validation errors', description: publishValidationErrors[0], variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      setPublishProgress({
        label: 'Saving post…',
        value: 10,
        indeterminate: false,
      });

      const { id } = await ensureDraft({
        onUploadProgress: ({ current, total, fileName }) => {
          const uploadEnd = 55;
          const value = total
            ? 10 + Math.round((current / total) * (uploadEnd - 10))
            : 10;
          setPublishProgress({
            label: total > 1 ? `Uploading media (${current}/${total})…` : 'Uploading media…',
            subtitle: fileName,
            value,
            indeterminate: false,
          });
        },
      });

      setPublishProgress({
        label: 'Preparing to publish…',
        value: 60,
        indeterminate: false,
      });

      const nowIso = new Date().toISOString();
      await updatePost(id, {
        ...buildPayload('scheduled'),
        scheduled_at: nowIso,
      });

      setPublishProgress({
        label: getPublishPlatformLabel(publishFacebook, publishInstagram),
        value: 75,
        indeterminate: true,
      });

      await invokeFunction('publishPost', { postId: id });

      setPublishProgress({
        label: 'Published!',
        value: 100,
        indeterminate: false,
      });
      showToast({ title: 'Post published', variant: 'success' });
      await new Promise((resolve) => { setTimeout(resolve, 400); });
      openPostDetail(id);
    } catch (err) {
      showToast({ title: 'Publish failed', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
      setPublishProgress(null);
    }
  };

  const handleSubmitForReview = () =>
    runWithValidation(async () => {
      const { id } = await ensureDraft();
      const resubmitting = existingPost?.approval_status === 'changes_requested';
      await updatePost(id, buildPayload('draft', 'pending'));
      setApprovalStatus('pending');
      if (resubmitting) {
        await logPostActivity(id, 'updated', 'Post updated and resubmitted for review');
      }
      await logPostActivity(id, 'approval', 'Submitted for review');
      showToast({ title: 'Post submitted for review', variant: 'success' });
      listWorkflowApproverUserIds()
        .then((recipientUserIds) => notifyWorkflowEvent({
          event: 'submitted_for_review',
          postId: id,
          recipientUserIds,
        }))
        .catch(() => {});
      navigate('/app/queue');
    }, draftValidationErrors);

  const fbCaption = getEffectiveCaption(caption, platformOverrides, 'facebook');
  const igCaption = getEffectiveCaption(caption, platformOverrides, 'instagram');

  const fineTuneHints = [];
  if (!simplifiedComposer) {
    if (publishFacebook && draftFineTuneValidation.platformStatus.facebook?.errors.length) {
      fineTuneHints.push('Facebook is incomplete');
    }
    if (publishInstagram && draftFineTuneValidation.platformStatus.instagram?.errors.length) {
      fineTuneHints.push('Instagram is incomplete');
    }
  }

  if (isEditMode && loadingPost) {
    return <p className="text-muted-foreground">Loading post…</p>;
  }

  if (isEditMode && isFetched && !loadingPost && (isError || !existingPost)) {
    return (
      <div className="rounded-hyve-md border border-red-200 bg-[#FCE4E3] p-4 text-sm text-[#A62E2B]">
        <p className="font-medium">Could not load this post for editing.</p>
        <p className="mt-1">{error?.message || 'The post may have been deleted or you may not have access.'}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => openPostDetail(editPostId)}
        >
          Back to post
        </Button>
      </div>
    );
  }

  if (isEditMode && isPublished) {
    return (
      <div className="rounded-hyve-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        This post has been published and can no longer be edited in the composer.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <div className="grid gap-6 lg:grid-cols-2">
        <GenericContentStep
          internalName={internalName}
          setInternalName={setInternalName}
          label={label}
          setLabel={setLabel}
          caption={caption}
          setCaption={setCaption}
          captionHint={captionHint}
          publishFacebook={publishFacebook}
          setPublishFacebook={setPublishFacebook}
          publishInstagram={publishInstagram}
          setPublishInstagram={setPublishInstagram}
          fbAccounts={fbAccounts}
          igAccounts={igAccounts}
          facebookAccountId={facebookAccountId}
          setFacebookAccountId={handleFacebookAccountChange}
          instagramAccountId={instagramAccountId}
          setInstagramAccountId={setInstagramAccountId}
          onInstagramManualChange={() => { igManuallySetRef.current = true; }}
          scheduledAt={scheduledAt}
          setScheduledAt={setScheduledAt}
          scheduleTimezone={scheduleTimezone}
          setScheduleTimezone={setScheduleTimezone}
          workspaceTimezone={workspaceTimezone}
          media={media}
          setMedia={handleMediaChange}
          validationErrors={draftValidationErrors}
          simplified={simplifiedComposer}
          showCanvaImport={showCanvaImport}
        />

        <div className="lg:sticky lg:top-[4.5rem] lg:z-0 lg:self-start">
          <PlatformPreviewTabs
            caption={caption}
            media={media}
            scheduledAt={scheduledAtUtc || scheduledAt}
            scheduleTimezone={scheduleTimezone}
            publishFacebook={publishFacebook}
            publishInstagram={publishInstagram}
            facebookAccountId={facebookAccountId}
            instagramAccountId={instagramAccountId}
            currentPostId={draftPostId}
            facebookCaption={fbCaption}
            instagramCaption={igCaption}
            platformOverrides={platformOverrides}
          />
        </div>
      </div>

      {publishProgress && (
        <PublishProgressPanel
          label={publishProgress.label}
          subtitle={publishProgress.subtitle}
          value={publishProgress.value}
          indeterminate={publishProgress.indeterminate}
        />
      )}

      <ComposerActionBar
        saving={saving}
        publishing={!!publishProgress}
        isEditMode={isEditMode}
        isQueued={isQueued}
        scheduledAt={scheduledAt}
        scheduleTimezone={scheduleTimezone}
        approvalStatus={approvalStatus}
        canBypassApproval={canBypassApproval}
        canSubmitForReview={!clientScheduleOnly}
        fineTuneHints={fineTuneHints}
        onSaveDraft={handleSaveDraft}
        onSaveChanges={handleSaveChanges}
        onSubmitForReview={handleSubmitForReview}
        onSchedule={handleSchedule}
        onPublishNow={handlePublishNow}
      />

      {!simplifiedComposer && (
        <FineTunePanel
          open={fineTuneOpen}
          onOpenChange={setFineTuneOpen}
          caption={caption}
          internalName={internalName}
          label={label}
          platformOverrides={platformOverrides}
          setPlatformOverrides={setPlatformOverrides}
          firstComment={firstComment}
          setFirstComment={setFirstComment}
          scheduledAt={scheduledAt}
          scheduleTimezone={scheduleTimezone}
          publishFacebook={publishFacebook}
          publishInstagram={publishInstagram}
          media={media}
          onMediaChange={handleMediaChange}
          instagramAccountId={instagramAccountId}
          postId={draftPostId}
          clientName={activeClient?.name}
        />
      )}
    </div>
  );
}
