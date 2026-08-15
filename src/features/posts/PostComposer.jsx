import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createPost,
  addPostMedia,
  schedulePost,
  uploadMediaFile,
  updatePost,
} from '@/lib/posts';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { GenericContentStep } from '@/features/posts/composer/GenericContentStep';
import { FineTuneStep } from '@/features/posts/composer/FineTuneStep';
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

export function PostComposer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetDate = searchParams.get('date');

  const [step, setStep] = useState(1);
  const [draftPostId, setDraftPostId] = useState(null);
  const [internalName, setInternalName] = useState('');
  const [label, setLabel] = useState('');
  const [caption, setCaption] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [platformOverrides, setPlatformOverrides] = useState({});
  const [publishFacebook, setPublishFacebook] = useState(true);
  const [publishInstagram, setPublishInstagram] = useState(true);
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (presetDate) {
      const d = new Date(presetDate);
      d.setHours(12, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    }
    return '';
  });
  const [media, setMedia] = useState([]);
  const [saving, setSaving] = useState(false);

  const validationErrors = validatePost({ caption, media, publishInstagram, publishFacebook });
  const captionHint = publishInstagram
    ? `${caption.length}/${IG_CAPTION_LIMIT} (Instagram)`
    : `${caption.length}/${FB_CAPTION_LIMIT} (Facebook)`;

  const buildPayload = (status, approvalStatus) => ({
    caption,
    internal_name: internalName || null,
    label: label || null,
    first_comment: firstComment || null,
    platform_overrides: platformOverrides,
    status,
    approval_status: approvalStatus,
    publish_facebook: publishFacebook,
    publish_instagram: publishInstagram,
    scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
  });

  const saveMediaToPost = async (postId) => {
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
  };

  const ensureDraft = async () => {
    if (draftPostId) {
      await updatePost(draftPostId, buildPayload('draft', 'draft'));
      return draftPostId;
    }
    const post = await createPost(buildPayload('draft', 'draft'));
    await saveMediaToPost(post.id);
    setDraftPostId(post.id);
    return post.id;
  };

  const runWithValidation = async (action) => {
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

  const handleNext = () =>
    runWithValidation(async () => {
      await ensureDraft();
      setStep(2);
    });

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
      const scheduleDate = new Date(scheduledAt);
      const minSchedule = new Date(Date.now() + 10 * 60 * 1000);
      if (scheduleDate < minSchedule) {
        alert('Schedule time must be at least 10 minutes in the future');
        return;
      }
      const id = await ensureDraft();
      await updatePost(id, buildPayload('scheduled', 'draft'));
      await schedulePost(id, scheduleDate.toISOString());
      navigate('/app/calendar');
    });

  const handlePublishNow = () =>
    runWithValidation(async () => {
      const id = await ensureDraft();
      await updatePost(id, {
        ...buildPayload('scheduled', 'draft'),
        scheduled_at: new Date().toISOString(),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={step === 1 ? 'font-semibold text-ink' : ''}>1. Content</span>
        <span>→</span>
        <span className={step === 2 ? 'font-semibold text-ink' : ''}>2. Fine-tune</span>
      </div>

      {step === 1 ? (
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
          media={media}
          setMedia={setMedia}
          validationErrors={validationErrors}
          onNext={handleNext}
          saving={saving}
        />
      ) : (
        <FineTuneStep
          step={step}
          setStep={setStep}
          caption={caption}
          platformOverrides={platformOverrides}
          setPlatformOverrides={setPlatformOverrides}
          firstComment={firstComment}
          setFirstComment={setFirstComment}
          scheduledAt={scheduledAt}
          publishFacebook={publishFacebook}
          publishInstagram={publishInstagram}
          media={media}
          postId={draftPostId}
          saving={saving}
          onSaveDraft={handleSaveDraft}
          onSubmitForReview={handleSubmitForReview}
          onSchedule={handleSchedule}
          onPublishNow={handlePublishNow}
        />
      )}
    </div>
  );
}
