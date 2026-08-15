import { Upload } from 'lucide-react';
import { CanvaDesignPicker } from '@/features/integrations/canva/CanvaDesignPicker';
import { MediaStrip, MAX_CAROUSEL_ITEMS } from '@/features/posts/MediaStrip';
import { PlatformChip } from '@/components/brand/PlatformChip';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  media,
  setMedia,
  validationErrors,
  onNext,
  saving,
}) {
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

  const handleFileUpload = (e) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Step 1 — Content</CardTitle>
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

        <Button onClick={onNext} disabled={saving}>
          {saving ? 'Saving…' : 'Next — Fine-tune'}
        </Button>
      </CardContent>
    </Card>
  );
}
