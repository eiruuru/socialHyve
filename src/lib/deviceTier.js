import { useCallback, useEffect, useState } from 'react';

export const DEVICE_TIERS = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
};

const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

export function getDeviceTier(width = typeof window !== 'undefined' ? window.innerWidth : DESKTOP_MIN) {
  if (width < TABLET_MIN) return DEVICE_TIERS.MOBILE;
  if (width < DESKTOP_MIN) return DEVICE_TIERS.TABLET;
  return DEVICE_TIERS.DESKTOP;
}

const TIER_RANK = {
  [DEVICE_TIERS.MOBILE]: 0,
  [DEVICE_TIERS.TABLET]: 1,
  [DEVICE_TIERS.DESKTOP]: 2,
};

export function tierAtLeast(tier, minimum) {
  return TIER_RANK[tier] >= TIER_RANK[minimum];
}

function normalizePath(pathname) {
  const path = pathname.startsWith('/app') ? pathname : `/app${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
  return path.replace(/\/+$/, '') || '/app';
}

/** Routes blocked below a minimum tier. Unlisted routes are allowed on all tiers. */
const ROUTE_MIN_TIER = [
  { pattern: /^\/app\/calendar(\/|$)/, minTier: DEVICE_TIERS.TABLET },
  { pattern: /^\/app\/interactions(\/|$)/, minTier: DEVICE_TIERS.TABLET },
  { pattern: /^\/app\/posts\/import(\/|$)/, minTier: DEVICE_TIERS.TABLET },
  { pattern: /^\/app\/settings\/canva(\/|$)/, minTier: DEVICE_TIERS.TABLET },
  { pattern: /^\/app\/settings\/accounts(\/|$)/, minTier: DEVICE_TIERS.TABLET },
  { pattern: /^\/app\/settings\/meta(\/|$)/, minTier: DEVICE_TIERS.TABLET },
  { pattern: /^\/app\/help(\/|$)/, minTier: DEVICE_TIERS.TABLET },
  { pattern: /^\/app\/clients(\/|$)/, minTier: DEVICE_TIERS.DESKTOP },
  { pattern: /^\/app\/team(\/|$)/, minTier: DEVICE_TIERS.DESKTOP },
];

export function isRouteAllowed(pathname, tier = DEVICE_TIERS.DESKTOP) {
  const path = normalizePath(pathname);
  for (const { pattern, minTier } of ROUTE_MIN_TIER) {
    if (pattern.test(path)) {
      return tierAtLeast(tier, minTier);
    }
  }
  return true;
}

export function getDefaultAppPath(tier) {
  if (tier === DEVICE_TIERS.MOBILE) return '/app/queue';
  return '/app/calendar';
}

/** On phone, calendar routes are unavailable — send users to the queue instead. */
export function resolveTierAppPath(path, tier = DEVICE_TIERS.DESKTOP) {
  if (tier !== DEVICE_TIERS.MOBILE) return path;
  if (path === '/app/calendar' || path.startsWith('/app/calendar/') || path.startsWith('/app/calendar?')) {
    return '/app/queue';
  }
  return path;
}

export function isSimplifiedComposerTier(tier) {
  return tier === DEVICE_TIERS.MOBILE || tier === DEVICE_TIERS.TABLET;
}

export function isTabletCalendarTier(tier) {
  return tier === DEVICE_TIERS.TABLET;
}

export function useDeviceTier() {
  const [tier, setTier] = useState(() => getDeviceTier());

  useEffect(() => {
    const mobileMq = window.matchMedia(`(max-width: ${TABLET_MIN - 1}px)`);
    const desktopMq = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);

    const update = () => setTier(getDeviceTier(window.innerWidth));
    update();

    mobileMq.addEventListener('change', update);
    desktopMq.addEventListener('change', update);
    window.addEventListener('resize', update);

    return () => {
      mobileMq.removeEventListener('change', update);
      desktopMq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return tier;
}

export function useStandaloneDisplay() {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const check = () => {
      const mq = window.matchMedia('(display-mode: standalone)');
      setStandalone(mq.matches || window.navigator.standalone === true);
    };
    check();
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
  }, []);

  return standalone;
}

export function useIsMobileLayout() {
  const tier = useDeviceTier();
  return tier === DEVICE_TIERS.MOBILE;
}

export function useIsTabletLayout() {
  const tier = useDeviceTier();
  return tier === DEVICE_TIERS.TABLET;
}

/** Phone settings: profile + notifications only. Tablet+: all tabs. */
export function getSettingsTabsForTier(tier) {
  if (tier === DEVICE_TIERS.MOBILE) {
    return ['profile', 'notifications'];
  }
  return null;
}

export function useCopyToClipboard() {
  return useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);
}
