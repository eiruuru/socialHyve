import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/AuthContext';
import { ToastProvider } from '@/lib/toast';
import { AppRoutes } from '@/app/AppRoutes';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { registerServiceWorker } from '@/lib/pushNotifications';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const ReviewLinkPage = lazy(() => import('@/pages/ReviewLinkPage'));

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
              <Route path="/login" element={<Navigate to="/app/login" replace />} />
              <Route path="/review/:token" element={<ReviewLinkPage />} />
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
