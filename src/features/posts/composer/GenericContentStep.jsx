import { useState } from 'react';
import { Upload } from 'lucide-react';
import { CanvaDesignPicker } from '@/features/integrations/canva/CanvaDesignPicker';
import { MediaStrip, MAX_CAROUSEL_ITEMS } from '@/features/posts/MediaStrip';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { TimezoneSelect } from '@/components/schedule/TimezoneSelect';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizationTips } from '@/features/posts/composer/OptimizationTips';
import { formatTimezoneLabel } from '@/lib/scheduleTime';
import { uploadDraftMediaFile } from '@/lib/posts';

const LABEL_PRESETS = ['Campaign', 'Product launch', 'Evergreen', 'Promo', 'Event'];

export function GenericContentStep({
  internalName,
  setInternalName,
  label,
  setLabel,
  caption,
  setCaption,
  captionHint,
  publishFacebook,
  setPublishFacebook,
  publishInstagram,
  setPublishInstagram,
  scheduledAt,
  setScheduledAt,
  scheduleTimezone,
  setScheduleTimezone,
  media,
  setMedia,
  validationErrors,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [uploadError, setUploadError] = useState('');

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
    e.target.value = '';
    if (!files.length) return;

    const remaining = MAX_CAROUSEL_ITEMS - media.length;
    const toAdd = files.slice(0, remaining);
    if (!toAdd.length) return;

    setUploadError('');
    setUploading(true);
    setUploadProgress({ current: 0, total: toAdd.length, fileName: toAdd[0].name });

    const uploaded = [];
    try {
      for (let i = 0; i < toAdd.length; i++) {
        const file = toAdd[i];
        setUploadProgress({ current: i, total: toAdd.length, fileName: file.name });
        const result = await uploadDraftMediaFile(file);
        uploaded.push({
          source: 'upload',
          public_url: result.public_url,
          storage_path: result.storage_path,
          mime_type: result.mime_type,
          sort_order: media.length + i,
        });
        setUploadProgress({ current: i + 1, total: toAdd.length, fileName: file.name });
      }

      setMedia((prev) => [...prev, ...uploaded.map((item, i) => ({
        ...item,
        sort_order: prev.length + i,
      }))]);
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0, fileName: '' });
    }
  };

  const uploadPercent = uploadProgress.total
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
    : 0;

  const mediaBusy = uploading || media.length >= MAX_CAROUSEL_ITEMS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Post name</label>
          <Input
            placeholder="Name your post (internal)"
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Label / campaign</label>
          <Input
            list="label-presets"
            placeholder="Campaign tag"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <datalist id="label-presets">
            {LABEL_PRESETS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Caption</label>
          <Textarea
            placeholder="Write your caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={6}
          />
          <p className="mt-1 text-xs text-muted-foreground">{captionHint}</p>
          <OptimizationTips
            caption={caption}
            media={media}
            publishInstagram={publishInstagram}
            scheduledAt={scheduledAt}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Platforms</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPublishFacebook((v) => !v)}
              className={`rounded-full transition-opacity ${publishFacebook ? 'opacity-100' : 'opacity-40'}`}
            >
              <PlatformChip platform="facebook" />
            </button>
            <button
              type="button"
              onClick={() => setPublishInstagram((v) => !v)}
              className={`rounded-full transition-opacity ${publishInstagram ? 'opacity-100' : 'opacity-40'}`}
            >
              <PlatformChip platform="instagram" />
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Schedule</label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <TimezoneSelect
              value={scheduleTimezone}
              onChange={setScheduleTimezone}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Posts at this time in {formatTimezoneLabel(scheduleTimezone)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Media</p>
            <div className="flex items-center gap-1">
              <CanvaDesignPicker
                iconOnly
                onSelect={handleCanvaSelect}
                mediaCount={media.length}
                disabled={mediaBusy}
              />
              <IconTooltip title="Upload media" description="Add images or videos from your device">
                <label
                  className={
                    mediaBusy
                      ? 'inline-flex cursor-not-allowed opacity-50'
                      : 'inline-flex cursor-pointer'
                  }
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-neutral-100">
                    <Upload className="h-4 w-4" />
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    disabled={mediaBusy}
                    onChange={handleFileUpload}
                    aria-label="Upload media"
                  />
                </label>
              </IconTooltip>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2 rounded-md border border-honey/30 bg-honey-light/30 p-3">
              <ProgressBar value={uploadPercent} />
              <p className="text-sm font-medium text-ink">
                Uploading {uploadProgress.current} of {uploadProgress.total}
                {uploadProgress.fileName ? `: ${uploadProgress.fileName}` : ''}
              </p>
            </div>
          )}

          {uploadError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</p>
          )}

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
  );
}
