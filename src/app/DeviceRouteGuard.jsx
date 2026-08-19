import { useLocation } from 'react-router-dom';
import { DesktopFeatureGate } from '@/components/DesktopFeatureGate';
import { isRouteAllowed, useDeviceTier } from '@/lib/deviceTier';

const FEATURE_LABELS = {
  '/app/calendar': 'Calendar',
  '/app/interactions': 'Interactions inbox',
  '/app/posts/import': 'CSV import',
  '/app/settings/canva': 'Canva integration',
  '/app/settings/accounts': 'Social Links',
  '/app/settings/meta': 'Meta connections',
  '/app/help': 'Help & FAQ',
};

function featureLabel(pathname) {
  for (const [prefix, label] of Object.entries(FEATURE_LABELS)) {
    if (pathname.startsWith(prefix)) return label;
  }
  return 'This feature';
}

export function DeviceRouteGuard({ children }) {
  const tier = useDeviceTier();
  const { pathname } = useLocation();

  if (!isRouteAllowed(pathname, tier)) {
    return <DesktopFeatureGate featureName={featureLabel(pathname)} />;
  }

  return children;
}
