import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { clearModalLocks } from '@/lib/clearModalLocks';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useMembership } from '@/lib/membershipContext';
import { useClient } from '@/lib/clientContext';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Logo } from '@/components/brand/Logo';
import { ClientSwitcher } from '@/components/ClientSwitcher';
import { useNavigateOnClientSwitch } from '@/app/useNavigateOnClientSwitch';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { HeaderClientSwitcher } from '@/components/HeaderClientSwitcher';
import { IconTooltip } from '@/components/ui/IconTooltip';
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

const SIDEBAR_COLLAPSED_KEY = 'socialhyve_sidebar_collapsed';

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  return { collapsed, toggleCollapsed };
}

function SidebarLink({ to, label, icon: Icon, highlight = false, onNavigate, collapsed }) {
  const link = (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center rounded-hyve-sm py-2 text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-2' : 'gap-3 px-3',
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
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </NavLink>
  );

  if (collapsed) {
    return (
      <IconTooltip title={label} side="right" className="block w-full">
        {link}
      </IconTooltip>
    );
  }

  return link;
}

function NavGroup({ label, items, onNavigate, collapsed, showDivider = false }) {
  return (
    <div className={cn(showDivider && 'border-t border-sidebar-border pt-2')}>
      {label && !collapsed ? (
        <p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 first:pt-1">
          {label}
        </p>
      ) : null}
      <div className="space-y-0.5">
        {items.map(({ to, label: itemLabel, icon, highlight }) => (
          <SidebarLink
            key={to}
            to={to}
            label={itemLabel}
            icon={icon}
            highlight={highlight}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </div>
    </div>
  );
}

function SidebarPanel({
  membership,
  workspace,
  user,
  roleDisplay,
  showClientSwitcher,
  navGroups,
  onNavigate,
  collapsed,
  onToggleCollapse,
}) {
  const { activeClient } = useClient();
  const workspaceInitial = workspace?.name?.trim()?.charAt(0)?.toUpperCase() || 'W';

  return (
    <>
      <div className={cn('border-b border-sidebar-border py-4', collapsed ? 'px-2' : 'px-5')}>
        {workspace?.name && !membership.isClientOnly ? (
          collapsed ? (
            <IconTooltip title={workspace.name} side="right" className="mx-auto block w-fit">
              <div
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-hyve-sm bg-honey text-sm font-bold text-white shadow-hyve-sm"
                aria-hidden
              >
                {workspaceInitial}
              </div>
            </IconTooltip>
          ) : (
            <div
              className="mb-3 truncate rounded-hyve-sm bg-honey px-3 py-2 text-sm font-semibold text-white shadow-hyve-sm"
              title={workspace.name}
            >
              {workspace.name}
            </div>
          )
        ) : null}
        {showClientSwitcher ? (
          collapsed ? (
            <div className={workspace?.name && !membership.isClientOnly ? 'mt-3' : undefined}>
              <IconTooltip title={activeClient?.name || 'Switch client'} side="right" className="block w-full">
                <HeaderClientSwitcher iconOnly menuPlacement="right" className="w-full" />
              </IconTooltip>
            </div>
          ) : (
            <ClientSwitcher />
          )
        ) : null}
        {!collapsed ? (
          <>
            <p className={cn('truncate text-xs text-neutral-400', showClientSwitcher && 'mt-3')}>
              Signed in as {user?.email}
            </p>
            {roleDisplay ? (
              <p className="mt-0.5 text-xs capitalize text-neutral-500">{roleDisplay}</p>
            ) : null}
          </>
        ) : null}
      </div>

      <nav className={cn('flex-1 space-y-2 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        {navGroups.map((group, index) => (
          <NavGroup
            key={group.label ?? 'primary'}
            label={group.label}
            items={group.items}
            onNavigate={onNavigate}
            collapsed={collapsed}
            showDivider={collapsed && index > 0}
          />
        ))}
      </nav>

      <div className={cn('border-t border-sidebar-border p-2', collapsed ? 'px-2' : 'px-3')}>
        {collapsed ? (
          <IconTooltip title="Expand sidebar" side="right" className="block w-full">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex min-h-10 w-full items-center justify-center rounded-hyve-sm text-neutral-400 transition-colors hover:bg-sidebar-accent hover:text-white"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </IconTooltip>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex min-h-10 w-full items-center gap-2 rounded-hyve-sm px-3 text-sm text-neutral-400 transition-colors hover:bg-sidebar-accent hover:text-white"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span>Collapse</span>
          </button>
        )}
      </div>
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
  const { collapsed: sidebarCollapsed, toggleCollapsed: toggleSidebarCollapsed } = useSidebarCollapsed();
  useNavigateOnClientSwitch();

  useEffect(() => {
    clearModalLocks();
  }, [location.pathname]);

  const isWide = location.pathname.includes('/calendar')
    || location.pathname.includes('/interactions');
  const isMobile = tier === DEVICE_TIERS.MOBILE;
  const showSidebar = !isMobile;

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
          isMobile && 'pb-[calc(4rem+env(safe-area-inset-bottom,0px))]',
        )}
      >
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 pt-safe sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Logo variant="dark" />
          </div>
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            {showClientSwitcher && isMobile ? <HeaderClientSwitcher /> : null}
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
          {showSidebar ? (
            <aside
              className={cn(
                'sticky top-14 z-40 flex h-[calc(100dvh-3.5rem)] shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out',
                sidebarCollapsed ? 'w-16' : 'w-60',
              )}
            >
              <SidebarPanel
                membership={membership}
                workspace={workspace}
                user={user}
                roleDisplay={roleDisplay}
                showClientSwitcher={showClientSwitcher}
                navGroups={navGroups}
                collapsed={sidebarCollapsed}
                onToggleCollapse={toggleSidebarCollapsed}
              />
            </aside>
          ) : null}

          <main className="min-w-0 flex-1 bg-paper">
            <div
              className={cn(
                'mx-auto',
                isMobile ? 'max-w-none p-4' : 'max-w-none p-5 lg:p-8',
                isWide && !isMobile ? 'max-w-none' : !isMobile && !isWide && 'lg:max-w-6xl',
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
