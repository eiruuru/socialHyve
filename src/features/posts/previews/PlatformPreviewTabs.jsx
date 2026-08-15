import { useEffect, useState } from 'react';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FacebookFeedPreview } from './FacebookFeedPreview';
import { InstagramFeedPreview } from './InstagramFeedPreview';

export function PlatformPreviewTabs({
  caption,
  media,
  publishFacebook = true,
  publishInstagram = true,
}) {
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

  const preview =
    tab === 'facebook' ? (
      <FacebookFeedPreview caption={caption} media={media} />
    ) : (
      <InstagramFeedPreview caption={caption} media={media} />
    );

  if (!showTabs) {
    return preview;
  }

  return (
    <TabsRoot value={tab} onValueChange={setTab}>
      <TabsList className="mb-4 grid w-full grid-cols-2">
        <TabsTrigger value="facebook">Facebook</TabsTrigger>
        <TabsTrigger value="instagram">Instagram</TabsTrigger>
      </TabsList>
      <TabsContent value="facebook" className="mt-0">
        <FacebookFeedPreview caption={caption} media={media} />
      </TabsContent>
      <TabsContent value="instagram" className="mt-0">
        <InstagramFeedPreview caption={caption} media={media} />
      </TabsContent>
    </TabsRoot>
  );
}
