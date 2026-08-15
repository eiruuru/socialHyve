import { useEffect, useState } from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { useOptionalClient } from '@/lib/clientContext';
import { FacebookFeedPreview } from './FacebookFeedPreview';
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
  clientId: clientIdProp,
  currentPostId,
  facebookCaption,
  instagramCaption,
}) {
  const clientCtx = useOptionalClient();
  const clientId = clientIdProp || clientCtx?.activeClient?.id;

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

  const renderPreview = (platform) => {
    if (platform === 'facebook') {
      return (
        <PreviewFrame platform="facebook" scheduledAt={scheduledAt}>
          <FacebookFeedPreview caption={facebookCaption ?? caption} media={media} embedded />
        </PreviewFrame>
      );
    }
    return (
      <InstagramPreviewPanel
        caption={instagramCaption ?? caption}
        media={media}
        scheduledAt={scheduledAt}
        clientId={clientId}
        currentPostId={currentPostId}
      />
    );
  };

  const tabButton = (platform, Icon, label, description) => (
    <IconTooltip title={label} description={description} className="flex-1">
      <button
        type="button"
        onClick={() => setTab(platform)}
        aria-label={`${label} preview`}
        className={cn(
          'flex w-full items-center justify-center border-b-2 pb-2 transition-colors',
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
    <div>
      <div className="mb-3 flex gap-4">
        {showFacebook && tabButton('facebook', Facebook, 'Facebook', 'Preview as a Facebook post')}
        {showInstagram && tabButton('instagram', Instagram, 'Instagram', 'Preview as an Instagram post')}
      </div>
      {renderPreview(tab)}
    </div>
  );
}
