import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { AppLayout } from './AppLayout';
import { WorkspaceProvider } from '@/lib/WorkspaceContext';
import { EmptyHiveState } from '@/components/EmptyHiveState';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const QueuePage = lazy(() => import('@/pages/QueuePage'));
const PostComposerPage = lazy(() => import('@/pages/PostComposerPage'));
const PostDetailPage = lazy(() => import('@/pages/PostDetailPage'));
const ConnectedAccountsPage = lazy(() => import('@/pages/ConnectedAccountsPage'));
const CanvaSettingsPage = lazy(() => import('@/pages/CanvaSettingsPage'));

function Lazy({ children }) {
  return (
    <Suspense fallback={<EmptyHiveState title="Loading the hive…" compact />}>
      {children}
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Lazy><LoginPage /></Lazy>} />
      <Route element={<RequireAuth />}>
        <Route
          element={
            <WorkspaceProvider>
              <AppLayout />
            </WorkspaceProvider>
          }
        >
          <Route index element={<Navigate to="calendar" replace />} />
          <Route path="queue" element={<Lazy><QueuePage /></Lazy>} />
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
