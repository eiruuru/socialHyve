import { NavLink } from 'react-router-dom';
import { ClipboardCheck, FileText, Eye, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  '/app/queue': ClipboardCheck,
  '/app/posts/new': FileText,
  '/app/settings/account': Settings,
};

function resolveIcon(item) {
  if (item.icon) return item.icon;
  if (item.to.includes('/review')) return Eye;
  return ICONS[item.to] ?? Settings;
}

export function MobileBottomNav({ items }) {
  if (!items.length) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-sidebar-border bg-sidebar/95 pb-safe backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/90 md:hidden"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-stretch justify-around">
        {items.map((item) => {
          const Icon = resolveIcon(item);
          const isHighlight = item.highlight;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors',
                  isHighlight && isActive
                    ? 'text-honey'
                    : isActive
                      ? 'text-white'
                      : 'text-neutral-400 hover:text-neutral-200',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
