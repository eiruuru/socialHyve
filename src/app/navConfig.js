import {
  Calendar,
  ClipboardCheck,
  FileText,
  Link2,
  Palette,
  Eye,
  Settings,
  Upload,
  HelpCircle,
  MessageCircle,
  Shield,
} from 'lucide-react';
import { hasCreativesQaAccess, hasGuestAccess, isCreativesQaRole } from '@/lib/clientRoles';
import { DEVICE_TIERS, isRouteAllowed, tierAtLeast } from '@/lib/deviceTier';

export const settingsNavItem = {
  to: '/app/settings/account',
  label: 'Settings',
  icon: Settings,
  minTier: DEVICE_TIERS.MOBILE,
  show: () => true,
};

export const helpNavItem = {
  to: '/app/help',
  label: 'Help',
  icon: HelpCircle,
  minTier: DEVICE_TIERS.TABLET,
  show: () => true,
};

/** Shown in the top bar (tablet/desktop) instead of the sidebar */
export const HEADER_UTILITY_NAV_PATHS = new Set([
  settingsNavItem.to,
  helpNavItem.to,
]);

const orgNavGroups = [
  {
    label: null,
    items: [
      {
        to: '/app/posts/new',
        label: 'New Post',
        icon: FileText,
        highlight: true,
        minTier: DEVICE_TIERS.MOBILE,
        show: (m, c) => m.isOrgTeam && !m.isClientOnly && c.clients.length > 0,
      },
    ],
  },
  {
    label: 'Content',
    items: [
      {
        to: '/app/queue',
        label: 'Queue',
        icon: ClipboardCheck,
        minTier: DEVICE_TIERS.MOBILE,
        show: (m) => m.isOrgTeam && !m.isClientOnly,
      },
      {
        to: '/app/calendar',
        label: 'Calendar',
        icon: Calendar,
        minTier: DEVICE_TIERS.TABLET,
        show: (m) => m.isOrgTeam && !m.isClientOnly,
      },
      {
        to: '/app/posts/import',
        label: 'Import CSV',
        icon: Upload,
        minTier: DEVICE_TIERS.TABLET,
        show: (m, c) => m.isOrgTeam && !m.isClientOnly && c.clients.length > 0,
      },
    ],
  },
  {
    label: 'Engagement',
    items: [
      {
        to: '/app/interactions',
        label: 'Interactions',
        icon: MessageCircle,
        minTier: DEVICE_TIERS.TABLET,
        show: (m) => m.isOrgTeam && !m.isClientOnly,
      },
    ],
  },
  {
    label: 'Integrations',
    items: [
      {
        to: '/app/settings/accounts',
        label: 'Social Links',
        icon: Link2,
        minTier: DEVICE_TIERS.TABLET,
        show: (m, c) => m.isOrgTeam && !m.isClientOnly && c.clients.length > 0,
      },
      {
        to: '/app/settings/canva',
        label: 'Canva',
        icon: Palette,
        minTier: DEVICE_TIERS.TABLET,
        show: (m, c) => m.isOrgTeam && !m.isClientOnly && c.clients.length > 0,
      },
    ],
  },
  {
    label: 'Support',
    items: [
      settingsNavItem,
      helpNavItem,
      {
        to: '/app/admin',
        label: 'Admin',
        icon: Shield,
        minTier: DEVICE_TIERS.TABLET,
        show: (m) => m.isPlatformAdmin,
      },
    ],
  },
];

export function buildNavGroups(membership, clientCtx, tier = DEVICE_TIERS.DESKTOP) {
  let groups;

  if (membership.isClientOnly) {
    const qaAccess = hasCreativesQaAccess(membership);
    const guestAccess = hasGuestAccess(membership);
    groups = [];

    if (qaAccess) {
      const reviewItems = (membership.clientMemberships ?? [])
        .filter((cm) => isCreativesQaRole(cm.role))
        .map((cm) => ({
          to: `/app/client/${cm.clientId}/review`,
          label: cm.name || 'Client',
          icon: Eye,
          minTier: DEVICE_TIERS.MOBILE,
          show: () => true,
        }));
      groups.push({ label: 'Creative QA', items: reviewItems });
    }

    const contentItems = [];
    if (qaAccess) {
      contentItems.push({
        to: '/app/queue',
        label: 'Queue',
        icon: ClipboardCheck,
        minTier: DEVICE_TIERS.MOBILE,
        show: () => true,
      });
      contentItems.push({
        to: '/app/posts/new',
        label: 'New Post',
        icon: FileText,
        minTier: DEVICE_TIERS.MOBILE,
        show: () => false,
      });
    }
    if (qaAccess || guestAccess) {
      contentItems.push({
        to: '/app/calendar',
        label: 'Calendar',
        icon: Calendar,
        minTier: DEVICE_TIERS.TABLET,
        show: () => true,
      });
    }
    if (contentItems.length) {
      groups.push({ label: 'Content', items: contentItems });
    }

    groups.push({
      label: 'Support',
      items: [
        settingsNavItem,
        helpNavItem,
      ],
    });
  } else {
    groups = orgNavGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.show(membership, clientCtx)),
    }));
  }

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const minTier = item.minTier ?? DEVICE_TIERS.MOBILE;
        if (tier !== DEVICE_TIERS.MOBILE && HEADER_UTILITY_NAV_PATHS.has(item.to)) {
          return false;
        }
        return tierAtLeast(tier, minTier) && isRouteAllowed(item.to, tier);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

/** Flat list for mobile bottom nav */
export function getBottomNavItems(membership, clientCtx, tier) {
  const groups = buildNavGroups(membership, clientCtx, tier);
  const items = [];

  for (const group of groups) {
    for (const item of group.items) {
      if (item.to === '/app/help') continue;
      items.push(item);
    }
  }

  const priority = ['/app/queue', '/app/posts/new', '/app/settings/account'];
  const review = items.filter((i) => i.to.includes('/client/') && i.to.includes('/review'));
  const core = priority
    .map((to) => items.find((i) => i.to === to))
    .filter(Boolean);

  if (review.length === 1) {
    return [...core.slice(0, 2), review[0], core[2]].filter(Boolean).slice(0, 4);
  }

  return core.slice(0, 4);
}
