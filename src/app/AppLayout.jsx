import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { clearModalLocks } from '@/lib/clearModalLocks';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useMembership } from '@/lib/membershipContext';
import { useClient } from '@/lib/clientContext';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Logo } from '@/components/brand/Logo';
import { ClientSwitcher } from '@/components/ClientSwitcher';
import { useNavigateOnClientSwitch } from '@/app/useNavigateOnClientSwitch';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { formatRoleLabel } from '@/lib/clientRoles';
import { NotificationsProvider } from '@/lib/notifications/NotificationsProvider';
import { PendingClientInviteNotifier } from '@/lib/PendingClientInviteNotifier';
import { buildNavGroups, getBottomNavItems } from '@/app/navConfig';
import { MobileBottomNav } from '@/app/MobileBottomNav';
import {
  DEVICE_TIERS,
  useDeviceTier,
  useStandaloneDisplay,
} from '@/lib/deviceTier';

function SidebarLink({ to, label, icon: Icon, highlight = false, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-hyve-sm px-3 py-2 text-sm font-medium transition-colors',
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

function NavGroup({ label, items, onNavigate }) {
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
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function SidebarPanel({ membership, workspace, user, roleDisplay, showClientSwitcher, navGroups, onNavigate }) {
  return (
    <>
      <div className="border-b border-sidebar-border px-5 py-4">
        {workspace?.name && !membership.isClientOnly && (
          <div
            className="mb-3 truncate rounded-hyve-sm bg-honey px-3 py-2 text-sm font-semibold text-white shadow-hyve-sm"
            title={workspace.name}
          >
            {workspace.name}
          </div>
        )}
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
          <NavGroup
            key={group.label ?? 'primary'}
            label={group.label}
            items={group.items}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </>
  );
}

export function AppLayout() {
  const { logout, user } = useAuth();
  const membership = useMembership();
  const clientCtx = useClient();
  const { workspace } = useWorkspace();
  const location = useLocation();
  const tier = useDeviceTier();
  const standalone = useStandaloneDisplay();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useNavigateOnClientSwitch();

  useEffect(() => {
    clearModalLocks();
  }, [location.pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const isWide = location.pathname.includes('/calendar')
    || location.pathname.includes('/interactions');
  const isMobile = tier === DEVICE_TIERS.MOBILE;
  const isTablet = tier === DEVICE_TIERS.TABLET;
  const isDesktop = tier === DEVICE_TIERS.DESKTOP;

  const navGroups = buildNavGroups(membership, clientCtx, tier);
  const bottomNavItems = isMobile ? getBottomNavItems(membership, clientCtx, tier) : [];
  const showClientSwitcher = !membership.isClientOnly
    || (membership.isClientOnly && clientCtx.clients.length > 1);

  const roleDisplay = membership.roleLabel
    ? formatRoleLabel(membership.roleLabel)
    : null;

  return (
    <NotificationsProvider>
      <PendingClientInviteNotifier />
      <div
        className={cn(
          'flex min-h-[100dvh] flex-col bg-paper',
          standalone && 'standalone-app',
          isMobile && 'pb-16',
        )}
      >
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 pt-safe sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {isTablet && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-hyve-sm text-neutral-200 hover:bg-sidebar-accent hover:text-white lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <Logo variant="dark" />
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <NotificationBell variant="icon" />
            <button
              type="button"
              onClick={logout}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-hyve-sm px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-sidebar-accent hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-start">
          {isDesktop && (
            <aside className="sticky top-14 z-40 flex h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
              <SidebarPanel
                membership={membership}
                workspace={workspace}
                user={user}
                roleDisplay={roleDisplay}
                showClientSwitcher={showClientSwitcher}
                navGroups={navGroups}
              />
            </aside>
          )}

          {isTablet && drawerOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-50 bg-ink/50 lg:hidden"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
              />
              <aside className="fixed left-0 top-14 z-50 flex h-[calc(100dvh-3.5rem)] w-72 flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-hyve-lg lg:hidden">
                <div className="flex items-center justify-end border-b border-sidebar-border px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-hyve-sm text-neutral-200 hover:bg-sidebar-accent"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <SidebarPanel
                  membership={membership}
                  workspace={workspace}
                  user={user}
                  roleDisplay={roleDisplay}
                  showClientSwitcher={showClientSwitcher}
                  navGroups={navGroups}
                  onNavigate={() => setDrawerOpen(false)}
                />
              </aside>
            </>
          )}

          <main className="min-w-0 flex-1 bg-paper">
            <div
              className={cn(
                'mx-auto',
                isMobile ? 'max-w-none p-4' : isTablet ? 'max-w-none p-5' : 'p-8',
                isWide && !isMobile ? 'max-w-none' : !isMobile && !isWide && 'max-w-6xl',
              )}
            >
              <Outlet />
            </div>
          </main>
        </div>

        {isMobile && <MobileBottomNav items={bottomNavItems} />}
      </div>
    </NotificationsProvider>
  );
}
