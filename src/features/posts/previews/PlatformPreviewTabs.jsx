import { useEffect, useState } from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { useOptionalClient } from '@/lib/clientContext';
import { getPlatformPlacement } from '@/features/posts/platformOverrides';
import { FacebookFeedPreview } from './FacebookFeedPreview';
import { FacebookReelsPreview } from './FacebookReelsPreview';
import { FacebookStoriesPreview } from './FacebookStoriesPreview';
import { InstagramPreviewPanel } from './InstagramPreviewPanel';
import { PreviewFrame } from './PreviewFrame';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { cn } from '@/lib/utils';

export function PlatformPreviewTabs({
  caption,
  media,
  publishFacebook = true,
  publishInstagram = true,
  scheduledAt,
  scheduleTimezone,
  clientId: clientIdProp,
  currentPostId,
  facebookCaption,
  instagramCaption,
  facebookAccountId = null,
  instagramAccountId = null,
  platformOverrides = {},
}) {
  const clientCtx = useOptionalClient();
  const clientId = clientIdProp || clientCtx?.activeClient?.id;

  const facebookPlacement = getPlatformPlacement(platformOverrides, 'facebook');
  const instagramPlacement = getPlatformPlacement(platformOverrides, 'instagram');

  const showFacebook = publishFacebook;
  const showInstagram = publishInstagram;
  const showTabs = showFacebook && showInstagram;

  const [tab, setTab] = useState(showFacebook ? 'facebook' : 'instagram');

  useEffect(() => {
    if (tab === 'facebook' && !showFacebook) setTab('instagram');
    if (tab === 'instagram' && !showInstagram) setTab('facebook');
  }, [showFacebook, showInstagram, tab]);

  if (!showFacebook && !showInstagram) {
    return (
      <p className="text-sm text-muted-foreground">
        Select at least one platform to see a preview.
      </p>
    );
  }

  const renderFacebookPreview = () => {
    const captionText = facebookCaption ?? caption;
    if (facebookPlacement === 'reels') {
      return (
        <PreviewFrame
          platform="facebook"
          scheduledAt={scheduledAt}
          scheduleTimezone={scheduleTimezone}
          layout="vertical"
        >
          <FacebookReelsPreview
            caption={captionText}
            media={media}
            facebookAccountId={facebookAccountId}
          />
        </PreviewFrame>
      );
    }
    if (facebookPlacement === 'stories') {
      return (
        <PreviewFrame
          platform="facebook"
          scheduledAt={scheduledAt}
          scheduleTimezone={scheduleTimezone}
          layout="vertical"
        >
          <FacebookStoriesPreview
            caption={captionText}
            media={media}
            facebookAccountId={facebookAccountId}
          />
        </PreviewFrame>
      );
    }
    return (
      <PreviewFrame platform="facebook" scheduledAt={scheduledAt} scheduleTimezone={scheduleTimezone}>
        <FacebookFeedPreview
          caption={captionText}
          media={media}
          embedded
          facebookAccountId={facebookAccountId}
          carouselMode={facebookPlacement === 'carousel'}
        />
      </PreviewFrame>
    );
  };

  const renderPreview = (platform) => {
    if (platform === 'facebook') {
      return renderFacebookPreview();
    }
    return (
      <InstagramPreviewPanel
        caption={instagramCaption ?? caption}
        media={media}
        scheduledAt={scheduledAt}
        scheduleTimezone={scheduleTimezone}
        clientId={clientId}
        currentPostId={currentPostId}
        publishInstagram={publishInstagram}
        instagramAccountId={instagramAccountId}
        placement={instagramPlacement}
        locationName={platformOverrides?.instagram?.location_name || platformOverrides?.instagram?.location || ''}
      />
    );
  };

  const tabButton = (platform, Icon, label, description) => (
    <IconTooltip title={label} description={description} className="min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setTab(platform)}
        aria-label={`${label} preview`}
        className={cn(
          'flex w-full min-w-0 items-center justify-center border-b-2 pb-2 transition-colors',
          tab === platform
            ? 'border-honey text-ink'
            : 'border-transparent text-muted-foreground hover:text-ink'
        )}
      >
        <Icon className="h-5 w-5" />
      </button>
    </IconTooltip>
  );

  if (!showTabs) {
    return renderPreview(tab);
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 flex min-w-0 gap-2">
        {showFacebook && tabButton('facebook', Facebook, 'Facebook', 'Preview as a Facebook post')}
        {showInstagram && tabButton('instagram', Instagram, 'Instagram', 'Preview as an Instagram post')}
      </div>
      {renderPreview(tab)}
    </div>
  );
}
