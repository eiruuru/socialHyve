import { useEffect, useState } from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { useOptionalClient } from '@/lib/clientContext';
import { FacebookFeedPreview } from './FacebookFeedPreview';
import { InstagramPreviewPanel } from './InstagramPreviewPanel';
import { PreviewFrame } from './PreviewFrame';
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
          <FacebookFeedPreview caption={facebookCaption ?? caption} media={media} />
        </PreviewFrame>
      );
    }
    return (
      <PreviewFrame platform="instagram" scheduledAt={scheduledAt}>
        <InstagramPreviewPanel
          caption={instagramCaption ?? caption}
          media={media}
          scheduledAt={scheduledAt}
          clientId={clientId}
          currentPostId={currentPostId}
        />
      </PreviewFrame>
    );
  };

  const tabButton = (platform, Icon, label) => (
    <button
      type="button"
      onClick={() => setTab(platform)}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 border-b-2 pb-2 text-sm font-medium transition-colors',
        tab === platform
          ? 'border-honey text-ink'
          : 'border-transparent text-muted-foreground hover:text-ink'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  if (!showTabs) {
    return renderPreview(tab);
  }

  return (
    <div>
      <div className="mb-4 flex gap-4">
        {showFacebook && tabButton('facebook', Facebook, 'Facebook')}
        {showInstagram && tabButton('instagram', Instagram, 'Instagram')}
      </div>
      {renderPreview(tab)}
    </div>
  );
}
