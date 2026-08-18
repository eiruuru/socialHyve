import { useEffect, useState } from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TabsList, TabsRoot, TabsTrigger } from '@/components/ui/tabs';
import {
  FB_CAPTION_LIMIT,
  getPlatformPlacement,
  getPublishMode,
  IG_CAPTION_LIMIT,
} from '@/features/posts/platformOverrides';
import { PlacementSelector } from './PlacementSelector';
import { PublishModeToggle } from './PublishModeToggle';
import { CaptionOverrideField } from './CaptionOverrideField';
import { CarouselLinkField } from './CarouselLinkField';
import { FineTuneMediaPanel } from './FineTuneMediaPanel';
import { cn } from '@/lib/utils';

function ScheduleOverrideField({ value, onChange, fallback, scheduleTimezone }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium">Schedule override</label>
      <Input
        type="datetime-local"
        value={value ?? fallback ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[11px] text-muted-foreground">
        Uses client timezone ({scheduleTimezone || 'local'}). Leave blank to use main schedule.
      </p>
    </div>
  );
}

function FacebookEditor({
  data,
  onUpdate,
  caption,
  internalName,
  label,
  scheduledAt,
  scheduleTimezone,
  media,
  onMediaChange,
}) {
  const placement = getPlatformPlacement({ facebook: data }, 'facebook');
  const publishMode = getPublishMode({ facebook: data }, 'facebook');

  return (
    <div className="space-y-4">
      <PlacementSelector
        platform="facebook"
        value={placement}
        onChange={(value) => onUpdate('placement', value)}
      />
      <PublishModeToggle
        value={publishMode}
        onChange={(value) => onUpdate('publish_mode', value)}
      />
      <CaptionOverrideField
        platform="facebook"
        value={data.caption ?? ''}
        onChange={(value) => onUpdate('caption', value)}
        baseCaption={caption}
        internalName={internalName}
        label={label}
        charLimit={FB_CAPTION_LIMIT}
      />
      <ScheduleOverrideField
        value={data.scheduled_at ?? ''}
        onChange={(value) => onUpdate('scheduled_at', value)}
        fallback={scheduledAt}
        scheduleTimezone={scheduleTimezone}
      />
      {placement === 'carousel' && (
        <CarouselLinkField
          value={data.carousel_link ?? ''}
          onChange={(value) => onUpdate('carousel_link', value)}
        />
      )}
      <FineTuneMediaPanel
        media={media}
        onMediaChange={onMediaChange}
        placement={placement}
        platform="facebook"
      />
    </div>
  );
}

function InstagramEditor({
  data,
  onUpdate,
  caption,
  internalName,
  label,
  scheduledAt,
  scheduleTimezone,
  media,
  onMediaChange,
  firstComment,
  setFirstComment,
}) {
  const placement = getPlatformPlacement({ instagram: data }, 'instagram');
  const publishMode = getPublishMode({ instagram: data }, 'instagram');

  return (
    <div className="space-y-4">
      <PlacementSelector
        platform="instagram"
        value={placement}
        onChange={(value) => onUpdate('placement', value)}
      />
      <PublishModeToggle
        value={publishMode}
        onChange={(value) => onUpdate('publish_mode', value)}
      />
      <CaptionOverrideField
        platform="instagram"
        value={data.caption ?? ''}
        onChange={(value) => onUpdate('caption', value)}
        baseCaption={caption}
        internalName={internalName}
        label={label}
        charLimit={IG_CAPTION_LIMIT}
      />
      <ScheduleOverrideField
        value={data.scheduled_at ?? ''}
        onChange={(value) => onUpdate('scheduled_at', value)}
        fallback={scheduledAt}
        scheduleTimezone={scheduleTimezone}
      />
      <div className="space-y-1.5">
        <label className="block text-xs font-medium">First comment</label>
        <Textarea
          placeholder="Auto-post as first comment on Instagram"
          value={firstComment}
          onChange={(e) => setFirstComment(e.target.value)}
          rows={2}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium">Location</label>
          <Input
            placeholder="Optional — saved for future use"
            value={data.location ?? ''}
            onChange={(e) => onUpdate('location', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium">Collaborators</label>
          <Input
            placeholder="Optional — saved for future use"
            value={data.collaborators ?? ''}
            onChange={(e) => onUpdate('collaborators', e.target.value)}
          />
        </div>
      </div>
      <FineTuneMediaPanel
        media={media}
        onMediaChange={onMediaChange}
        placement={placement}
        platform="instagram"
      />
    </div>
  );
}

export function FineTunePlatformEditor({
  platformOverrides,
  setPlatformOverrides,
  publishFacebook,
  publishInstagram,
  caption,
  internalName,
  label,
  scheduledAt,
  scheduleTimezone,
  media,
  onMediaChange,
  firstComment,
  setFirstComment,
}) {
  const defaultTab = publishFacebook ? 'facebook' : 'instagram';
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    if (tab === 'facebook' && !publishFacebook) setTab('instagram');
    if (tab === 'instagram' && !publishInstagram) setTab('facebook');
  }, [publishFacebook, publishInstagram, tab]);

  const updateOverride = (platform, field, value) => {
    setPlatformOverrides((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  if (!publishFacebook && !publishInstagram) {
    return (
      <p className="text-sm text-muted-foreground">
        Select at least one platform above to customize per-platform settings.
      </p>
    );
  }

  const showTabs = publishFacebook && publishInstagram;

  return (
    <div>
      {showTabs && (
        <TabsRoot value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="w-full">
            {publishFacebook && (
              <TabsTrigger value="facebook" className="flex-1 gap-2">
                <Facebook className="h-4 w-4" />
                Facebook
              </TabsTrigger>
            )}
            {publishInstagram && (
              <TabsTrigger value="instagram" className="flex-1 gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </TabsTrigger>
            )}
          </TabsList>
        </TabsRoot>
      )}

      <div className={cn(!showTabs && 'pt-0')}>
        {(tab === 'facebook' && publishFacebook) && (
          <FacebookEditor
            data={platformOverrides.facebook || {}}
            onUpdate={(field, value) => updateOverride('facebook', field, value)}
            caption={caption}
            internalName={internalName}
            label={label}
            scheduledAt={scheduledAt}
            scheduleTimezone={scheduleTimezone}
            media={media}
            onMediaChange={onMediaChange}
          />
        )}
        {(tab === 'instagram' && publishInstagram) && (
          <InstagramEditor
            data={platformOverrides.instagram || {}}
            onUpdate={(field, value) => updateOverride('instagram', field, value)}
            caption={caption}
            internalName={internalName}
            label={label}
            scheduledAt={scheduledAt}
            scheduleTimezone={scheduleTimezone}
            media={media}
            onMediaChange={onMediaChange}
            firstComment={firstComment}
            setFirstComment={setFirstComment}
          />
        )}
      </div>
    </div>
  );
}
