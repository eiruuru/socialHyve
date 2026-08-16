import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Calendar,
  ClipboardCheck,
  FileText,
  Link2,
  LogOut,
  Palette,
  Users,
  Building2,
  Eye,
  User,
  Upload,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useMembership } from '@/lib/membershipContext';
import { useClient } from '@/lib/clientContext';
import { Logo } from '@/components/brand/Logo';
import { ClientSwitcher } from '@/components/ClientSwitcher';
import { useNavigateOnClientSwitch } from '@/app/useNavigateOnClientSwitch';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { formatRoleLabel, hasCreativesQaAccess, hasGuestAccess, isCreativesQaRole } from '@/lib/clientRoles';
import { NotificationsProvider } from '@/lib/notifications/NotificationsProvider';
import { PendingClientInviteNotifier } from '@/lib/PendingClientInviteNotifier';

const accountNavItem = {
  to: '/app/settings/account',
  label: 'Account',
  icon: User,
  show: () => true,
};

const orgNavGroups = [
  {
    label: null,
    items: [
      {
        to: '/app/posts/new',
        label: 'New Post',
        icon: FileText,
        highlight: true,
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
        show: (m) => m.isOrgTeam && !m.isClientOnly,
      },
      {
        to: '/app/calendar',
        label: 'Calendar',
        icon: Calendar,
        show: (m) => m.isOrgTeam && !m.isClientOnly,
      },
      {
        to: '/app/posts/import',
        label: 'Import CSV',
        icon: Upload,
        show: (m, c) => m.isOrgTeam && !m.isClientOnly && c.clients.length > 0,
      },
    ],
  },
  {
    label: 'Organization',
    items: [
      {
        to: '/app/clients',
        label: 'Clients',
        icon: Building2,
        show: (m) => m.isOrgTeam && !m.isClientOnly,
      },
      {
        to: '/app/team',
        label: 'Team',
        icon: Users,
        show: (m) => m.canManageTeam,
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
        show: (m, c) => m.isOrgTeam && !m.isClientOnly && c.clients.length > 0,
      },
      {
        to: '/app/settings/canva',
        label: 'Canva',
        icon: Palette,
        show: (m, c) => m.isOrgTeam && !m.isClientOnly && c.clients.length > 0,
      },
    ],
  },
  {
    label: 'Account',
    items: [
      accountNavItem,
      {
        to: '/app/help',
        label: 'Help',
        icon: HelpCircle,
        show: () => true,
      },
    ],
  },
];

function buildNavGroups(membership, clientCtx) {
  if (membership.isClientOnly) {
    const qaAccess = hasCreativesQaAccess(membership);
    const guestAccess = hasGuestAccess(membership);

    const groups = [];

    if (qaAccess) {
      const reviewItems = (membership.clientMemberships ?? [])
        .filter((cm) => isCreativesQaRole(cm.role))
        .map((cm) => ({
          to: `/app/client/${cm.clientId}/review`,
          label: cm.name || 'Client',
          icon: Eye,
          show: () => true,
        }));
      groups.push({ label: 'Creative QA', items: reviewItems });
    }

    const contentItems = [];
    if (qaAccess) {
      contentItems.push({ to: '/app/queue', label: 'Queue', icon: ClipboardCheck, show: () => true });
    }
    if (qaAccess || guestAccess) {
      contentItems.push({ to: '/app/calendar', label: 'Calendar', icon: Calendar, show: () => true });
    }
    if (contentItems.length) {
      groups.push({ label: 'Content', items: contentItems });
    }

    groups.push({
      label: 'Account',
      items: [
        accountNavItem,
        { to: '/app/help', label: 'Help', icon: HelpCircle, show: () => true },
      ],
    });

    return groups.filter((group) => group.items.length > 0);
  }

  return orgNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.show(membership, clientCtx)),
    }))
    .filter((group) => group.items.length > 0);
}

function SidebarLink({ to, label, icon: Icon, highlight = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex min-h-9 items-center gap-3 rounded-hyve-sm px-3 py-2 text-sm font-medium transition-colors',
          highlight
            ? cn(
                'mb-1 bg-honey text-white shadow-hyve-sm',
                isActive ? 'ring-2 ring-honey-light/60' : 'hover:bg-honey-dark',
              )
            : isActive
              ? 'bg-sidebar-accent text-white'
              : 'text-neutral-200 hover:bg-sidebar-accent hover:text-white',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function NavGroup({ label, items }) {
  return (
    <div className="space-y-0.5">
      {label && (
        <p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 first:pt-1">
          {label}
        </p>
      )}
      {items.map(({ to, label: itemLabel, icon, highlight }) => (
        <SidebarLink
          key={to}
          to={to}
          label={itemLabel}
          icon={icon}
          highlight={highlight}
        />
      ))}
    </div>
  );
}

export function AppLayout() {
  const { logout, user } = useAuth();
  const membership = useMembership();
  const clientCtx = useClient();
  const location = useLocation();
  useNavigateOnClientSwitch();
  const isWide = location.pathname.includes('/calendar');

  const navGroups = buildNavGroups(membership, clientCtx);
  const showClientSwitcher = !membership.isClientOnly
    || (membership.isClientOnly && clientCtx.clients.length > 1);

  const roleDisplay = membership.roleLabel
    ? formatRoleLabel(membership.roleLabel)
    : null;

  return (
    <NotificationsProvider>
      <PendingClientInviteNotifier />
      <div className="flex min-h-screen flex-col bg-paper">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 sm:px-5">
          <div className="flex items-center gap-3">
            <Logo variant="dark" />
            <NotificationBell variant="icon" />
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-hyve-sm px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-sidebar-accent hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>
        <div className="flex flex-1 items-start">
        <aside className="sticky top-14 z-30 flex h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
        <div className="border-b border-sidebar-border px-5 py-4">
          {showClientSwitcher && (
            <div>
              <ClientSwitcher />
            </div>
          )}
          <p className={cn('truncate text-xs text-neutral-400', showClientSwitcher && 'mt-3')}>
            Signed in as {user?.email}
          </p>
          {roleDisplay && (
            <p className="mt-0.5 text-xs capitalize text-neutral-500">{roleDisplay}</p>
          )}
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <NavGroup key={group.label ?? 'primary'} label={group.label} items={group.items} />
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 bg-paper">
        <div className={cn('mx-auto p-8', isWide ? 'max-w-none' : 'max-w-6xl')}>
          <Outlet />
        </div>
      </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
