import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  createPost,
  addPostMedia,
  schedulePost,
  uploadMediaFile,
  updatePost,
  getPost,
  removePostMedia,
  deleteStorageObject,
} from '@/lib/posts';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { useClient } from '@/lib/clientContext';
import {
  getBrowserTimezone,
  resolveScheduleTimezone,
  utcToZonedLocalInput,
  zonedLocalToUtc,
} from '@/lib/scheduleTime';
import { GenericContentStep } from '@/features/posts/composer/GenericContentStep';
import { ComposerActionBar } from '@/features/posts/composer/ComposerActionBar';
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
  const [searchParams] = useSearchParams();
  const presetDate = searchParams.get('date');
  const { activeClient } = useClient();
  const isEditMode = !!editPostId;
  const hydratedRef = useRef(false);
  const originalMediaIdsRef = useRef([]);
  const trackedStoragePathsRef = useRef(new Set());

  const defaultTimezone = activeClient?.default_timezone || getBrowserTimezone();

  const { data: existingPost, isLoading: loadingPost } = useQuery({
    queryKey: ['post', editPostId],
    queryFn: () => getPost(editPostId),
    enabled: isEditMode,
  });

  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  const [draftPostId, setDraftPostId] = useState(editPostId);
  const [internalName, setInternalName] = useState('');
  const [label, setLabel] = useState('');
  const [caption, setCaption] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [platformOverrides, setPlatformOverrides] = useState({});
  const [publishFacebook, setPublishFacebook] = useState(true);
  const [publishInstagram, setPublishInstagram] = useState(true);
  const [scheduleTimezone, setScheduleTimezone] = useState(defaultTimezone);
  const [scheduledAt, setScheduledAt] = useState('');
  const [media, setMedia] = useState([]);
  const [saving, setSaving] = useState(false);
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

  const isPublished = existingPost?.status === 'published';
  const validationErrors = validatePost({ caption, media, publishInstagram, publishFacebook });
  const captionHint = publishInstagram
    ? `${caption.length}/${IG_CAPTION_LIMIT} (Instagram)`
    : `${caption.length}/${FB_CAPTION_LIMIT} (Facebook)`;

  const scheduledAtUtc = scheduledAt
    ? zonedLocalToUtc(scheduledAt, scheduleTimezone)
    : null;

  const buildPayload = (status, nextApprovalStatus = approvalStatus) => ({
    caption,
    internal_name: internalName || null,
    label: label || null,
    first_comment: firstComment || null,
    platform_overrides: platformOverrides,
    status,
    approval_status: nextApprovalStatus,
    publish_facebook: publishFacebook,
    publish_instagram: publishInstagram,
    schedule_timezone: scheduleTimezone,
    scheduled_at: scheduledAtUtc,
  });

  const syncMedia = async (postId) => {
    const currentIds = new Set(media.filter((m) => m.id).map((m) => m.id));
    const currentPaths = new Set(media.filter((m) => m.storage_path).map((m) => m.storage_path));

    for (const id of originalMediaIdsRef.current) {
      if (!currentIds.has(id)) {
        await removePostMedia(id);
      }
    }

    for (const item of media) {
      if (item.file) {
        await uploadMediaFile(postId, item.file, item.sort_order);
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

  const ensureDraft = async () => {
    if (draftPostId) {
      await updatePost(draftPostId, buildPayload(existingPost?.status || 'draft'));
      await syncMedia(draftPostId);
      return draftPostId;
    }
    const post = await createPost(buildPayload('draft', 'draft'));
    await syncMedia(post.id);
    setDraftPostId(post.id);
    return post.id;
  };

  const runWithValidation = async (action) => {
    if (isPublished) {
      alert('Published posts cannot be edited.');
      return;
    }
    if (validationErrors.length) {
      alert(validationErrors.join('\n'));
      return;
    }
    setSaving(true);
    try {
      await action();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () =>
    runWithValidation(async () => {
      const id = await ensureDraft();
      navigate(`/app/posts/${id}`);
    });

  const handleSchedule = () =>
    runWithValidation(async () => {
      if (!scheduledAt) {
        alert('Please set a schedule date and time');
        return;
      }
      if (!scheduledAtUtc) {
        alert('Invalid schedule time');
        return;
      }
      const scheduleDate = new Date(scheduledAtUtc);
      const minSchedule = new Date(Date.now() + 10 * 60 * 1000);
      if (scheduleDate < minSchedule) {
        alert('Schedule time must be at least 10 minutes in the future');
        return;
      }
      const id = await ensureDraft();
      await updatePost(id, buildPayload('scheduled'));
      await schedulePost(id, scheduledAtUtc);
      navigate('/app/calendar');
    });

  const handlePublishNow = () =>
    runWithValidation(async () => {
      const id = await ensureDraft();
      const nowIso = new Date().toISOString();
      await updatePost(id, {
        ...buildPayload('scheduled'),
        scheduled_at: nowIso,
      });
      await invokeFunction('publishPost', { postId: id });
      navigate(`/app/posts/${id}`);
    });

  const handleSubmitForReview = () =>
    runWithValidation(async () => {
      const id = await ensureDraft();
      await updatePost(id, buildPayload('draft', 'pending'));
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
            currentPostId={draftPostId}
            facebookCaption={fbCaption}
            instagramCaption={igCaption}
          />
        </div>
      </div>

      <ComposerActionBar
        saving={saving}
        scheduledAt={scheduledAt}
        scheduleTimezone={scheduleTimezone}
        onSaveDraft={handleSaveDraft}
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
