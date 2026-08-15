import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Calendar, ClipboardCheck, FileText, Link2, LogOut, Palette, Users, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Logo } from '@/components/brand/Logo';
import { ClientSwitcher } from '@/components/ClientSwitcher';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/app/queue', label: 'Queue', icon: ClipboardCheck },
  { to: '/app/calendar', label: 'Calendar', icon: Calendar },
  { to: '/app/posts/new', label: 'New Post', icon: FileText },
  { to: '/app/clients', label: 'Clients', icon: Building2 },
  { to: '/app/team', label: 'Team', icon: Users },
  { to: '/app/settings/accounts', label: 'Accounts', icon: Link2 },
  { to: '/app/settings/canva', label: 'Canva', icon: Palette },
];

export function AppLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const isWide = location.pathname.includes('/calendar');

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="border-b border-sidebar-border px-5 py-6">
          <Logo variant="dark" />
          <div className="mt-4">
            <ClientSwitcher />
          </div>
          <p className="mt-2 truncate text-xs text-neutral-400">
            Signed in as {user?.email}
          </p>
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
