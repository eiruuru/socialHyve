import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { getDefaultAppPath, useDeviceTier } from '@/lib/deviceTier';
import { cn } from '@/lib/utils';

const HEADER_BG = `
  radial-gradient(circle at 15% 18%, rgba(246,166,0,.12), transparent 55%),
  var(--paper)
`;

function useMarketingCta() {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const tier = useDeviceTier();
  const appPath = getDefaultAppPath(tier);
  return { isAuthenticated, isLoadingAuth, user, appPath };
}

export function MarketingHeader({ backToHome = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, isLoadingAuth, user, appPath } = useMarketingCta();

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className="sticky top-0 z-40 border-b border-neutral-200 pt-safe"
      style={{ background: HEADER_BG }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="shrink-0" onClick={closeMenu}>
          <Logo />
        </Link>

        {backToHome ? (
          <Link
            to="/"
            className="hidden items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-ink sm:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        ) : null}

        <div className="hidden items-center gap-2 sm:flex sm:gap-3">
          {!backToHome ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/faq">FAQ</Link>
            </Button>
          ) : null}
          {isLoadingAuth ? (
            <span className="text-sm text-neutral-400">…</span>
          ) : isAuthenticated ? (
            <>
              {user?.email ? (
                <span className="hidden max-w-[12rem] truncate text-sm text-neutral-600 md:inline">
                  {user.email}
                </span>
              ) : null}
              <Button size="sm" asChild>
                <Link to={appPath}>Open app</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/app/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/app/login?signup=1">Get started free</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-hyve-sm border border-neutral-200 bg-white text-ink sm:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen ? (
        <nav
          aria-label="Site menu"
          className="border-t border-neutral-200 bg-paper px-4 py-3 pb-safe sm:hidden"
        >
          <div className="flex flex-col gap-2">
            {backToHome ? (
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-hyve-sm px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                onClick={closeMenu}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Link>
            ) : (
              <Link
                to="/faq"
                className="rounded-hyve-sm px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                onClick={closeMenu}
              >
                FAQ
              </Link>
            )}
            {isLoadingAuth ? null : isAuthenticated ? (
              <>
                {user?.email ? (
                  <p className="px-3 py-1 text-xs text-neutral-500">{user.email}</p>
                ) : null}
                <Button className="w-full justify-center" asChild>
                  <Link to={appPath} onClick={closeMenu}>
                    Open app
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="w-full justify-center" asChild>
                  <Link to="/app/login" onClick={closeMenu}>
                    Sign in
                  </Link>
                </Button>
                <Button className="w-full justify-center" asChild>
                  <Link to="/app/login?signup=1" onClick={closeMenu}>
                    Get started free
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

export function MarketingFooter() {
  const { isAuthenticated, appPath } = useMarketingCta();

  return (
    <footer className="bg-ink px-4 py-10 text-neutral-400 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <Link to="/">
          <Logo variant="dark" />
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link to="/faq" className="transition-colors hover:text-white">
            FAQ
          </Link>
          {isAuthenticated ? (
            <Link to={appPath} className="transition-colors hover:text-white">
              Open app
            </Link>
          ) : (
            <Link to="/app/login" className="transition-colors hover:text-white">
              Sign in
            </Link>
          )}
          <span className="text-neutral-500">socialHyve · Schedule smarter, approve faster.</span>
        </div>
      </div>
    </footer>
  );
}

export function MarketingPrimaryCta({ size = 'default', className, children, signupLabel = 'Get started free →' }) {
  const { isAuthenticated, isLoadingAuth, appPath } = useMarketingCta();

  if (isLoadingAuth) {
    return (
      <Button size={size} className={className} disabled>
        …
      </Button>
    );
  }

  if (isAuthenticated) {
    return (
      <Button size={size} className={className} asChild>
        <Link to={appPath}>Open app →</Link>
      </Button>
    );
  }

  return (
    <Button size={size} className={className} asChild>
      <Link to="/app/login?signup=1">{children ?? signupLabel}</Link>
    </Button>
  );
}

export function MarketingPage({ children, className }) {
  return <div className={cn('min-h-screen overflow-x-hidden bg-paper', className)}>{children}</div>;
}
