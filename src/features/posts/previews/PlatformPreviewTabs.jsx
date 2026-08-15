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

  const tabButton = (platform, Icon) => (
    <button
      type="button"
      onClick={() => setTab(platform)}
      title={platform === 'facebook' ? 'Facebook' : 'Instagram'}
      aria-label={platform === 'facebook' ? 'Facebook preview' : 'Instagram preview'}
      className={cn(
        'flex flex-1 items-center justify-center border-b-2 pb-2 transition-colors',
        tab === platform
          ? 'border-honey text-ink'
          : 'border-transparent text-muted-foreground hover:text-ink'
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );

  if (!showTabs) {
    return renderPreview(tab);
  }

  return (
    <div>
      <div className="mb-3 flex gap-4">
        {showFacebook && tabButton('facebook', Facebook)}
        {showInstagram && tabButton('instagram', Instagram)}
      </div>
      {renderPreview(tab)}
    </div>
  );
}
