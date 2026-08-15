import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, ClipboardCheck, Save, Send } from 'lucide-react';
import {
  createPost,
  addPostMedia,
  schedulePost,
  uploadMediaFile,
  updatePost,
} from '@/lib/posts';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { GenericContentStep } from '@/features/posts/composer/GenericContentStep';
import { FineTunePanel } from '@/features/posts/composer/FineTunePanel';
import { PlatformPreviewTabs } from '@/features/posts/previews/PlatformPreviewTabs';
import { MAX_CAROUSEL_ITEMS } from '@/features/posts/MediaStrip';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';

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

  const [fineTuneOpen, setFineTuneOpen] = useState(false);
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

  const fbCaption = platformOverrides.facebook?.caption ?? caption;
  const igCaption = platformOverrides.instagram?.caption ?? caption;

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
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

        <div className="lg:sticky lg:top-8 lg:self-start">
          <PlatformPreviewTabs
            caption={caption}
            media={media}
            scheduledAt={scheduledAt}
            publishFacebook={publishFacebook}
            publishInstagram={publishInstagram}
            currentPostId={draftPostId}
            facebookCaption={fbCaption}
            instagramCaption={igCaption}
          />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-8 border-t bg-paper/95 px-8 py-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <IconTooltip title="Save draft" description="Keep your work without publishing">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSaveDraft}
              disabled={saving}
              aria-label="Save draft"
            >
              <Save className="h-4 w-4" />
            </Button>
          </IconTooltip>
          <IconTooltip title="Submit for review" description="Send to the approval queue">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleSubmitForReview}
              disabled={saving}
              aria-label="Submit for review"
            >
              <ClipboardCheck className="h-4 w-4" />
            </Button>
          </IconTooltip>
          <IconTooltip title="Schedule" description="Publish automatically at the set time">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleSchedule}
              disabled={saving}
              aria-label="Schedule"
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </IconTooltip>
          <IconTooltip title="Publish now" description="Post immediately to connected accounts">
            <Button
              size="icon"
              onClick={handlePublishNow}
              disabled={saving}
              aria-label="Publish now"
            >
              <Send className="h-4 w-4" />
            </Button>
          </IconTooltip>
        </div>
      </div>
    </div>
  );
}
