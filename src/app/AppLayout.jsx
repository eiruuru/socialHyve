import { NavLink, Outlet } from 'react-router-dom';
import { Calendar, FileText, Link2, LogOut, Palette } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/app/calendar', label: 'Calendar', icon: Calendar },
  { to: '/app/posts/new', label: 'New Post', icon: FileText },
  { to: '/app/settings/accounts', label: 'Accounts', icon: Link2 },
  { to: '/app/settings/canva', label: 'Canva', icon: Palette },
];

export function AppLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r bg-sidebar">
        <div className="border-b px-6 py-5">
          <h1 className="text-xl font-bold text-sidebar-primary">socialHyve</h1>
          <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
