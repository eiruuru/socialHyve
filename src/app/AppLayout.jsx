import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { recoverStaleDialogLayers } from '@/lib/clearModalLocks';
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
import { buildNavGroups, getBottomNavItems, helpNavItem, settingsNavItem } from '@/app/navConfig';
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

function HeaderNavIcon({ to, label, icon: Icon }) {
  return (
    <IconTooltip title={label} side="bottom">
      <NavLink
        to={to}
        className={({ isActive }) =>
          cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-hyve-sm transition-colors',
            isActive
              ? 'bg-sidebar-accent text-white'
              : 'text-neutral-200 hover:bg-sidebar-accent hover:text-white',
          )
        }
        aria-label={label}
      >
        <Icon className="h-5 w-5" />
      </NavLink>
    </IconTooltip>
  );
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
    recoverStaleDialogLayers();
  }, [location.pathname]);

  const isWide = location.pathname.includes('/calendar')
    || location.pathname.includes('/interactions');
  const isMobile = tier === DEVICE_TIERS.MOBILE;
  const showHeaderUtilityNav = !isMobile;
  const showSidebar = !isMobile;

  const navGroups = buildNavGroups(membership, clientCtx, tier);
  const bottomNavItems = isMobile ? getBottomNavItems(membership, clientCtx, tier) : [];
  const showClientSwitcher = !membership.isClientOnly
    || (membership.isClientOnly && clientCtx.clients.length > 1);

  const roleDisplay = membership.roleLabel
    ? formatRoleLabel(membership.roleLabel)
    : null;

  const shellPadding = cn(
    'px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))]',
    'sm:px-3 sm:pb-3 sm:pt-[calc(0.75rem+env(safe-area-inset-top,0px))]',
    'pl-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))]',
    'sm:pl-[max(0.75rem,env(safe-area-inset-left,0px))] sm:pr-[max(0.75rem,env(safe-area-inset-right,0px))]',
  );

  return (
    <NotificationsProvider>
      <PendingClientInviteNotifier />
      <div
        className={cn(
          'flex min-h-[100dvh] flex-col gap-2 bg-paper sm:gap-3',
          standalone && 'standalone-app',
          showSidebar
            ? cn('box-border h-dvh', shellPadding)
            : cn(
                shellPadding,
                isMobile && 'pb-[calc(4rem+env(safe-area-inset-bottom,0px))]',
              ),
        )}
      >
        <header className="app-chrome-panel flex h-14 shrink-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Logo variant="dark" />
          </div>
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            {showHeaderUtilityNav ? (
              <>
                <div className="flex items-center gap-0.5">
                  {showClientSwitcher ? <HeaderClientSwitcher iconOnly /> : null}
                  <HeaderNavIcon
                    to={settingsNavItem.to}
                    label={settingsNavItem.label}
                    icon={settingsNavItem.icon}
                  />
                  <HeaderNavIcon
                    to={helpNavItem.to}
                    label={helpNavItem.label}
                    icon={helpNavItem.icon}
                  />
                </div>
                <div
                  className="mx-1 h-6 w-px shrink-0 bg-sidebar-border/80"
                  role="separator"
                  aria-orientation="vertical"
                />
              </>
            ) : null}
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

        <div className={cn('flex min-h-0 flex-1 gap-2 sm:gap-3')}>
          {showSidebar ? (
            <aside
              className={cn(
                'app-chrome-panel flex min-h-0 shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-out',
                sidebarCollapsed ? 'w-16' : 'w-60',
              )}
            >
              <SidebarPanel
                membership={membership}
                workspace={workspace}
                user={user}
                roleDisplay={roleDisplay}
                showClientSwitcher={showClientSwitcher && isMobile}
                navGroups={navGroups}
                collapsed={sidebarCollapsed}
                onToggleCollapse={toggleSidebarCollapsed}
              />
            </aside>
          ) : null}

          <main className="app-content-panel min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div
              className={cn(
                'mx-auto w-full',
                'p-3 sm:p-4 md:p-5 lg:p-8',
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
