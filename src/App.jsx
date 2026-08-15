import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/AuthContext';
import { AppRoutes } from '@/app/AppRoutes';
import { EmptyHiveState } from '@/components/EmptyHiveState';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/review/:token" element={<ReviewLinkPage />} />
              <Route path="/app/*" element={<AppRoutes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
