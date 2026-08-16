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
import {
  getPublishPlatformLabel,
  PublishProgressPanel,
} from '@/features/posts/composer/PublishProgressPanel';
import { FineTunePanel } from '@/features/posts/composer/FineTunePanel';
import { PlatformPreviewTabs } from '@/features/posts/previews/PlatformPreviewTabs';
import { MAX_CAROUSEL_ITEMS } from '@/features/posts/MediaStrip';

const IG_CAPTION_LIMIT = 2200;
const FB_CAPTION_LIMIT = 63206;

function validatePost({ caption, media, publishInstagram, publishFacebook }) {
  const errors = [];
  if (publishInstagram && !media.length) {
    errors.push('Instagram requires at least one image or video.');
  }
  if (media.length > MAX_CAROUSEL_ITEMS) {
    errors.push(`Maximum ${MAX_CAROUSEL_ITEMS} media items per carousel.`);
  }
  if (publishInstagram && caption.length > IG_CAPTION_LIMIT) {
    errors.push(`Instagram caption exceeds ${IG_CAPTION_LIMIT} characters.`);
  }
  if (publishFacebook && caption.length > FB_CAPTION_LIMIT) {
    errors.push(`Facebook caption exceeds ${FB_CAPTION_LIMIT} characters.`);
  }
  return errors;
}

export function PostComposer({ editPostId = null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const presetDate = searchParams.get('date');
  const { activeClient } = useClient();
  const membership = useMembership();
  const { canManageTeam } = membership;
  const clientScheduleOnly = hasCreativesQaAccess(membership);
  const isEditMode = !!editPostId;
  const hydratedRef = useRef(false);
  const accountsInitializedRef = useRef(false);
  const igManuallySetRef = useRef(false);
  const originalMediaIdsRef = useRef([]);
  const trackedStoragePathsRef = useRef(new Set());

  const defaultTimezone = activeClient?.default_timezone || getBrowserTimezone();

  const { data: existingPost, isLoading: loadingPost } = useQuery({
    queryKey: ['post', editPostId],
    queryFn: () => getPost(editPostId),
    enabled: isEditMode,
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
  const [scheduleTimezone, setScheduleTimezone] = useState(defaultTimezone);
  const [scheduledAt, setScheduledAt] = useState('');
  const [media, setMedia] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);
  const [publishProgress, setPublishProgress] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState('draft');

  useEffect(() => {
    if (isEditMode) return;
    setScheduleTimezone(activeClient?.default_timezone || getBrowserTimezone());
  }, [activeClient?.id, activeClient?.default_timezone, isEditMode]);

  useEffect(() => {
    if (presetDate && !scheduledAt) {
      const tz = activeClient?.default_timezone || getBrowserTimezone();
      const d = new Date(presetDate);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(12, 0, 0, 0);
        setScheduledAt(utcToZonedLocalInput(d.toISOString(), tz));
      }
    }
  }, [presetDate, activeClient?.default_timezone, scheduledAt]);

  useEffect(() => {
    if (!existingPost || hydratedRef.current) return;
    hydratedRef.current = true;
    const tz = resolveScheduleTimezone({
      postTimezone: existingPost.schedule_timezone,
      clientTimezone: activeClient?.default_timezone,
    });
    setDraftPostId(existingPost.id);
    setInternalName(existingPost.internal_name || '');
    setLabel(existingPost.label || '');
    setCaption(existingPost.caption || '');
    setFirstComment(existingPost.first_comment || '');
    setPlatformOverrides(existingPost.platform_overrides || {});
    setPublishFacebook(existingPost.publish_facebook ?? true);
    setPublishInstagram(existingPost.publish_instagram ?? true);
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
  }, [existingPost, activeClient?.default_timezone]);

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
  const validationErrors = validatePost({ caption, media, publishInstagram, publishFacebook });
  const captionHint = publishInstagram
    ? `${caption.length}/${IG_CAPTION_LIMIT} (Instagram)`
    : `${caption.length}/${FB_CAPTION_LIMIT} (Facebook)`;

  const scheduledAtUtc = scheduledAt
    ? zonedLocalToUtc(scheduledAt, scheduleTimezone)
    : null;

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
      return draftPostId;
    }
    const post = await createPost(buildPayload('draft', 'draft'));
    await syncMedia(post.id, options);
    setDraftPostId(post.id);
    return post.id;
  };

  const runWithValidation = async (action) => {
    if (isPublished) {
      showToast({ title: 'Published posts cannot be edited', variant: 'error' });
      return;
    }
    if (validationErrors.length) {
      showToast({ title: 'Fix validation errors', description: validationErrors[0], variant: 'error' });
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
      const id = await ensureDraft();
      navigate(`/app/posts/${id}`);
    });

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
      const id = await ensureDraft();
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
      setSaveNotice('Changes saved');
      setTimeout(() => setSaveNotice(null), 4000);
    });

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
      const id = await ensureDraft();
      await updatePost(id, buildPayload('scheduled'));
      await schedulePost(id, scheduledAtUtc);
      showToast({
        title: 'Post scheduled',
        description: formatScheduledLabel(scheduledAtUtc, scheduleTimezone),
        variant: 'success',
      });
      navigate('/app/calendar');
    });

  const handlePublishNow = async () => {
    if (clientScheduleOnly) return;
    if (isPublished) {
      showToast({ title: 'Published posts cannot be edited', variant: 'error' });
      return;
    }
    if (approvalStatus !== 'approved' && requireApproval && !canManageTeam) {
      showToast({ title: 'Approval required', description: 'Submit for review and get approval before publishing.', variant: 'info' });
      return;
    }
    if (validationErrors.length) {
      showToast({ title: 'Fix validation errors', description: validationErrors[0], variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      setPublishProgress({
        label: 'Saving post…',
        value: 10,
        indeterminate: false,
      });

      const id = await ensureDraft({
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
      navigate(`/app/posts/${id}`);
    } catch (err) {
      showToast({ title: 'Publish failed', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
      setPublishProgress(null);
    }
  };

  const handleSubmitForReview = () =>
    runWithValidation(async () => {
      const id = await ensureDraft();
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
    });

  const fbCaption = platformOverrides.facebook?.caption ?? caption;
  const igCaption = platformOverrides.instagram?.caption ?? caption;

  if (isEditMode && loadingPost) {
    return <p className="text-muted-foreground">Loading post…</p>;
  }

  if (isEditMode && isPublished) {
    return (
      <div className="rounded-hyve-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        This post has been published and can no longer be edited in the composer.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
          media={media}
          setMedia={handleMediaChange}
          validationErrors={validationErrors}
        />

        <div className="lg:sticky lg:top-8 lg:self-start">
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
          />
        </div>
      </div>

      {saveNotice && (
        <div className="rounded-hyve-md bg-[#DFF3E6] px-4 py-3 text-sm text-status-published">
          {saveNotice}
        </div>
      )}

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
        canPublishNow={!clientScheduleOnly}
        canSubmitForReview={!clientScheduleOnly}
        onSaveDraft={handleSaveDraft}
        onSaveChanges={handleSaveChanges}
        onSubmitForReview={handleSubmitForReview}
        onSchedule={handleSchedule}
        onPublishNow={handlePublishNow}
      />

      <FineTunePanel
        open={fineTuneOpen}
        onOpenChange={setFineTuneOpen}
        caption={caption}
        platformOverrides={platformOverrides}
        setPlatformOverrides={setPlatformOverrides}
        firstComment={firstComment}
        setFirstComment={setFirstComment}
        scheduledAt={scheduledAt}
        publishFacebook={publishFacebook}
        publishInstagram={publishInstagram}
      />
    </div>
  );
}
