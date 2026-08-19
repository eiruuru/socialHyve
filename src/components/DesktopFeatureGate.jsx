import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Copy, Check } from 'lucide-react';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { Button } from '@/components/ui/button';
import { SITE_URL } from '@/lib/siteConfig';
import { useCopyToClipboard, useStandaloneDisplay } from '@/lib/deviceTier';

export function DesktopFeatureGate({
  featureName = 'This feature',
  description,
}) {
  const standalone = useStandaloneDisplay();
  const copy = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const desktopUrl = `${SITE_URL}${window.location.pathname}${window.location.search}`;

  const handleCopy = async () => {
    const ok = await copy(desktopUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const defaultDescription = standalone
    ? `${featureName} is available on the desktop web app at socialhyve.app. Open this link on a computer for the full experience.`
    : `${featureName} works best on a larger screen. Open socialHyve on a tablet or desktop, or widen your browser window.`;

  return (
    <div className="flex flex-col items-center py-12 text-center">
      <EmptyHiveState
        title={`${featureName} — larger screen needed`}
        description={description ?? defaultDescription}
      />
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="default">
          <Link to="/app/queue">
            <Monitor className="mr-2 h-4 w-4" />
            Back to queue
          </Link>
        </Button>
        <Button type="button" variant="outline" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Link copied
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy link for desktop
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
