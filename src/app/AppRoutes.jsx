import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { AppLayout } from './AppLayout';
import { WorkspaceProvider } from '@/lib/WorkspaceContext';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const PostComposerPage = lazy(() => import('@/pages/PostComposerPage'));
const PostDetailPage = lazy(() => import('@/pages/PostDetailPage'));
const ConnectedAccountsPage = lazy(() => import('@/pages/ConnectedAccountsPage'));
const CanvaSettingsPage = lazy(() => import('@/pages/CanvaSettingsPage'));

function Lazy({ children }) {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading...</div>}>
      {children}
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Lazy><LoginPage /></Lazy>} />
      <Route element={<RequireAuth />}>
        <Route
          element={
            <WorkspaceProvider>
              <AppLayout />
            </WorkspaceProvider>
          }
        >
          <Route index element={<Navigate to="/app/calendar" replace />} />
          <Route path="calendar" element={<Lazy><CalendarPage /></Lazy>} />
          <Route path="posts/new" element={<Lazy><PostComposerPage /></Lazy>} />
          <Route path="posts/:id" element={<Lazy><PostDetailPage /></Lazy>} />
          <Route path="settings/accounts" element={<Lazy><ConnectedAccountsPage /></Lazy>} />
          <Route path="settings/canva" element={<Lazy><CanvaSettingsPage /></Lazy>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/app/calendar" replace />} />
    </Routes>
  );
}
