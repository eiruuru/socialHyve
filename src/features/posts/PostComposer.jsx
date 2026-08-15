import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, ClipboardCheck, Save, Send, Upload } from 'lucide-react';
import {
  createPost,
  addPostMedia,
  schedulePost,
  uploadMediaFile,
} from '@/lib/posts';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { CanvaDesignPicker } from '@/features/integrations/canva/CanvaDesignPicker';
import { PlatformPreviewTabs } from '@/features/posts/previews/PlatformPreviewTabs';
import { MediaStrip, MAX_CAROUSEL_ITEMS } from '@/features/posts/MediaStrip';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  const [caption, setCaption] = useState('');
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

  const handleCanvaSelect = (item) => {
    if (media.length >= MAX_CAROUSEL_ITEMS) return;
    setMedia((prev) => [...prev, {
      source: 'canva',
      canva_design_id: item.canvaDesignId,
      public_url: item.publicUrl,
      storage_path: item.storagePath,
      mime_type: item.mimeType,
      sort_order: prev.length,
    }]);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setMedia((prev) => {
      const remaining = MAX_CAROUSEL_ITEMS - prev.length;
      const toAdd = files.slice(0, remaining);
      return [
        ...prev,
        ...toAdd.map((file, i) => ({
          source: 'upload',
          public_url: URL.createObjectURL(file),
          mime_type: file.type,
          file,
          sort_order: prev.length + i,
        })),
      ];
    });
    e.target.value = '';
  };

  const saveMediaToPost = async (postId) => {
    for (const item of media) {
      if (item.file) {
        await uploadMediaFile(postId, item.file, item.sort_order);
      } else {
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

  const handleSaveDraft = () => runWithValidation(async () => {
    const post = await createPost({
      caption,
      status: 'draft',
      publish_facebook: publishFacebook,
      publish_instagram: publishInstagram,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    });
    await saveMediaToPost(post.id);
    navigate(`/app/posts/${post.id}`);
  });

  const handleSchedule = () => runWithValidation(async () => {
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
    const post = await createPost({
      caption,
      status: 'scheduled',
      publish_facebook: publishFacebook,
      publish_instagram: publishInstagram,
      scheduled_at: scheduleDate.toISOString(),
    });
    await saveMediaToPost(post.id);
    await schedulePost(post.id, scheduleDate.toISOString());
    navigate('/app/calendar');
  });

  const handlePublishNow = () => runWithValidation(async () => {
    const post = await createPost({
      caption,
      status: 'scheduled',
      publish_facebook: publishFacebook,
      publish_instagram: publishInstagram,
      scheduled_at: new Date().toISOString(),
    });
    await saveMediaToPost(post.id);
    await invokeFunction('publishPost', { postId: post.id });
    navigate(`/app/posts/${post.id}`);
  });

  const handleSubmitForReview = () => runWithValidation(async () => {
    const post = await createPost({
      caption,
      status: 'draft',
      approval_status: 'pending',
      publish_facebook: publishFacebook,
      publish_instagram: publishInstagram,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    });
    await saveMediaToPost(post.id);
    navigate('/app/queue');
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Compose Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Write your caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">{captionHint}</p>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={publishFacebook}
                  onChange={(e) => setPublishFacebook(e.target.checked)}
                />
                Facebook
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={publishInstagram}
                  onChange={(e) => setPublishInstagram(e.target.checked)}
                />
                Instagram
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Schedule</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Media</p>
                <div className="flex items-center gap-1">
                  <CanvaDesignPicker
                    iconOnly
                    onSelect={handleCanvaSelect}
                    disabled={media.length >= MAX_CAROUSEL_ITEMS}
                  />
                  <label
                    className={
                      media.length >= MAX_CAROUSEL_ITEMS
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer'
                    }
                    title="Upload"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-neutral-100">
                      <Upload className="h-4 w-4" />
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      disabled={media.length >= MAX_CAROUSEL_ITEMS}
                      onChange={handleFileUpload}
                      aria-label="Upload media"
                    />
                  </label>
                </div>
              </div>
              <MediaStrip items={media} onChange={setMedia} />
            </div>

            {validationErrors.length > 0 && (
              <ul className="space-y-1 text-xs text-amber-600">
                {validationErrors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSaveDraft}
            disabled={saving}
            title="Save draft"
            aria-label="Save draft"
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleSubmitForReview}
            disabled={saving}
            title="Submit for review"
            aria-label="Submit for review"
          >
            <ClipboardCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleSchedule}
            disabled={saving}
            title="Schedule"
            aria-label="Schedule"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={handlePublishNow}
            disabled={saving}
            title="Publish now"
            aria-label="Publish now"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <h3 className="mb-4 font-display font-semibold">Preview</h3>
        <PlatformPreviewTabs
          caption={caption}
          media={media}
          publishFacebook={publishFacebook}
          publishInstagram={publishInstagram}
        />
      </div>
    </div>
  );
}
