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
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useMembership } from '@/lib/membershipContext';
import { useClient } from '@/lib/clientContext';
import { Logo } from '@/components/brand/Logo';
import { ClientSwitcher } from '@/components/ClientSwitcher';
import { useNavigateOnClientSwitch } from '@/app/useNavigateOnClientSwitch';
import { cn } from '@/lib/utils';

const allNavItems = [
  { to: '/app/queue', label: 'Queue', icon: ClipboardCheck, show: (m) => m.isOrgTeam && !m.isClientOnly },
  { to: '/app/calendar', label: 'Calendar', icon: Calendar, show: (m) => m.isOrgTeam && !m.isClientOnly },
  { to: '/app/posts/new', label: 'New Post', icon: FileText, show: (m, c) => m.isOrgTeam && !m.isClientOnly && c.clients.length > 0 },
  { to: '/app/clients', label: 'Clients', icon: Building2, show: (m) => m.isOrgTeam && !m.isClientOnly },
  { to: '/app/team', label: 'Team', icon: Users, show: (m) => m.canManageTeam },
  { to: '/app/settings/accounts', label: 'Accounts', icon: Link2, show: (m, c) => m.isOrgTeam && !m.isClientOnly && c.clients.length > 0 },
  { to: '/app/settings/canva', label: 'Canva', icon: Palette, show: (m, c) => m.isOrgTeam && !m.isClientOnly && c.clients.length > 0 },
];

export function AppLayout() {
  const { logout, user } = useAuth();
  const membership = useMembership();
  const clientCtx = useClient();
  const location = useLocation();
  useNavigateOnClientSwitch();
  const isWide = location.pathname.includes('/calendar');

  const clientReviewItems = membership.isClientOnly
    ? membership.clientMemberships.map((cm) => ({
        to: `/app/client/${cm.clientId}/review`,
        label: `${cm.name || 'Client'} review`,
        icon: Eye,
      }))
    : [];

  const navItems = membership.isClientOnly
    ? clientReviewItems
    : allNavItems.filter((item) => item.show(membership, clientCtx));

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
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-hyve-sm px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-white'
                    : 'text-neutral-200 hover:bg-sidebar-accent hover:text-white'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
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
