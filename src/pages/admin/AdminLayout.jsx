import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ADMIN_LINKS = [
  { to: '/app/admin', label: 'Overview', end: true },
  { to: '/app/admin/waitlist', label: 'Waitlist' },
  { to: '/app/admin/organizations', label: 'Organizations' },
  { to: '/app/admin/users', label: 'Users' },
];

export function AdminLayout() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">Platform</p>
        <h1 className="font-display text-2xl font-bold">Admin console</h1>
        <p className="text-sm text-muted-foreground">
          User management, waitlist, billing overrides, and cross-tenant support.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {ADMIN_LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'rounded-hyve-sm px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-honey text-white'
                  : 'text-neutral-600 hover:bg-paper-alt hover:text-ink',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
