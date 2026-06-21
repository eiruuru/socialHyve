import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  createPost,
  addPostMedia,
  schedulePost,
  uploadMediaFile,
} from '@/lib/posts';
import { invokeFunction } from '@/lib/supabaseFunctions';
import { CanvaDesignPicker } from '@/features/integrations/canva/CanvaDesignPicker';
import { FacebookPreview, InstagramPreview } from '@/features/posts/PlatformPreviews';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  const primaryMediaUrl = media[0]?.publicUrl || media[0]?.public_url;

  const handleCanvaSelect = (item) => {
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
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMedia((prev) => [...prev, {
      source: 'upload',
      public_url: url,
      mime_type: file.type,
      file,
      sort_order: prev.length,
    }]);
  };

  const removeMedia = (index) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const saveMediaToPost = async (postId) => {
    for (const item of media) {
      if (item.file) {
        await uploadMediaFile(postId, item.file);
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

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const post = await createPost({
        caption,
        status: 'draft',
        publish_facebook: publishFacebook,
        publish_instagram: publishInstagram,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      await saveMediaToPost(post.id);
      navigate(`/app/posts/${post.id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSchedule = async () => {
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
    setSaving(true);
    try {
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
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishNow = async () => {
    setSaving(true);
    try {
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
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Compose Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Write your caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">{caption.length} characters</p>

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
              <p className="text-sm font-medium">Media</p>
              <div className="flex gap-2">
                <CanvaDesignPicker onSelect={handleCanvaSelect} />
                <label className="cursor-pointer">
                  <span className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                    Upload
                  </span>
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              {media.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {media.map((item, i) => (
                    <div key={i} className="relative">
                      <img
                        src={item.public_url}
                        alt=""
                        className="h-20 w-20 rounded object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            Save Draft
          </Button>
          <Button variant="secondary" onClick={handleSchedule} disabled={saving}>
            Schedule
          </Button>
          <Button onClick={handlePublishNow} disabled={saving}>
            Publish Now
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Preview</h3>
        {publishFacebook && (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Facebook</p>
            <FacebookPreview caption={caption} mediaUrl={primaryMediaUrl} />
          </div>
        )}
        {publishInstagram && (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Instagram</p>
            <InstagramPreview caption={caption} mediaUrl={primaryMediaUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
