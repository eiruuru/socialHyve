import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginRedirect } from '@/app/LoginRedirect';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/AuthContext';
import { ToastProvider } from '@/lib/toast';
import { AppRoutes } from '@/app/AppRoutes';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { registerServiceWorker } from '@/lib/pushNotifications';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const ReviewLinkPage = lazy(() => import('@/pages/ReviewLinkPage'));
const ShortLinkRedirectPage = lazy(() => import('@/pages/ShortLinkRedirectPage'));
const WaitlistPage = lazy(() => import('@/pages/WaitlistPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const AcceptableUsePage = lazy(() => import('@/pages/AcceptableUsePage'));
const MarketingCapturePage = lazy(() => import('@/pages/MarketingCapturePage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <EmptyHiveState title="Loading the hive…" compact />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    registerServiceWorker().catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/waitlist" element={<WaitlistPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/acceptable-use" element={<AcceptableUsePage />} />
              <Route path="/login" element={<LoginRedirect />} />
              <Route path="/review/:token" element={<ReviewLinkPage />} />
              <Route path="/s/:slug" element={<ShortLinkRedirectPage />} />
              <Route path="/__marketing-capture" element={<MarketingCapturePage />} />
              <Route path="/app/*" element={<AppRoutes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
