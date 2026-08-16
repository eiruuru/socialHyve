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
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useMembership } from '@/lib/membershipContext';
import { useClient } from '@/lib/clientContext';
import { Logo } from '@/components/brand/Logo';
import { ClientSwitcher } from '@/components/ClientSwitcher';
import { useNavigateOnClientSwitch } from '@/app/useNavigateOnClientSwitch';
import { cn } from '@/lib/utils';

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
        label: 'Accounts',
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
    items: [accountNavItem],
  },
];

function buildNavGroups(membership, clientCtx) {
  if (membership.isClientOnly) {
    const reviewItems = membership.clientMemberships.map((cm) => ({
      to: `/app/client/${cm.clientId}/review`,
      label: `${cm.name || 'Client'} review`,
      icon: Eye,
      show: () => true,
    }));

    return [
      { label: 'Review', items: reviewItems },
      { label: 'Account', items: [accountNavItem] },
    ].filter((group) => group.items.length > 0);
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
          'flex items-center gap-3 rounded-hyve-sm px-3 py-2 text-sm font-medium transition-colors',
          highlight
            ? cn(
                'bg-honey text-white shadow-hyve-sm',
                isActive ? 'ring-2 ring-honey-light/60' : 'hover:bg-honey-dark',
              )
            : isActive
              ? 'bg-sidebar-accent text-white'
              : 'text-neutral-200 hover:bg-sidebar-accent hover:text-white',
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

function NavGroup({ label, items }) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 first:pt-0">
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

  const roleDisplay = membership.roleLabel
    ? membership.roleLabel.charAt(0).toUpperCase() + membership.roleLabel.slice(1)
    : null;

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="border-b border-sidebar-border px-5 py-6">
          <Logo variant="dark" />
          {!membership.isClientOnly && (
            <div className="mt-4">
              <ClientSwitcher />
            </div>
          )}
          <p className="mt-2 truncate text-xs text-neutral-400">
            Signed in as {user?.email}
          </p>
          {roleDisplay && (
            <p className="mt-0.5 text-xs capitalize text-neutral-500">{roleDisplay}</p>
          )}
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navGroups.map((group) => (
            <NavGroup key={group.label ?? 'primary'} label={group.label} items={group.items} />
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-hyve-sm px-3 py-2 text-sm text-neutral-200 hover:bg-sidebar-accent hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-paper">
        <div className={cn('mx-auto p-8', isWide ? 'max-w-none' : 'max-w-6xl')}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
