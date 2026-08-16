import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { AppLayout } from './AppLayout';
import { WorkspaceProvider } from '@/lib/WorkspaceContext';
import { ClientProvider } from '@/lib/clientContext';
import { MembershipProvider } from '@/lib/membershipContext';
import { ClientOnlyRedirect } from './ClientOnlyRedirect';
import { EmptyHiveState } from '@/components/EmptyHiveState';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const QueuePage = lazy(() => import('@/pages/QueuePage'));
const PostComposerPage = lazy(() => import('@/pages/PostComposerPage'));
const PostImportPage = lazy(() => import('@/pages/PostImportPage'));
const EditPostPage = lazy(() => import('@/pages/EditPostPage'));
const PostDetailPage = lazy(() => import('@/pages/PostDetailPage'));
const ConnectedAccountsPage = lazy(() => import('@/pages/ConnectedAccountsPage'));
const CanvaSettingsPage = lazy(() => import('@/pages/CanvaSettingsPage'));
const AccountSettingsPage = lazy(() => import('@/pages/AccountSettingsPage'));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const TeamPage = lazy(() => import('@/pages/TeamPage'));
const ClientMembersPage = lazy(() => import('@/pages/ClientMembersPage'));
const ClientReviewPage = lazy(() => import('@/pages/ClientReviewPage'));

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
              <ClientProvider>
                <MembershipProvider>
                  <ClientOnlyRedirect />
                  <AppLayout />
                </MembershipProvider>
              </ClientProvider>
            </WorkspaceProvider>
          }
        >
          <Route index element={<Navigate to="calendar" replace />} />
          <Route path="queue" element={<Lazy><QueuePage /></Lazy>} />
          <Route path="calendar" element={<Lazy><CalendarPage /></Lazy>} />
          <Route path="posts/new" element={<Lazy><PostComposerPage /></Lazy>} />
          <Route path="posts/import" element={<Lazy><PostImportPage /></Lazy>} />
          <Route path="posts/:id/edit" element={<Lazy><EditPostPage /></Lazy>} />
          <Route path="posts/:id" element={<Lazy><PostDetailPage /></Lazy>} />
          <Route path="clients" element={<Lazy><ClientsPage /></Lazy>} />
          <Route path="clients/:clientId/members" element={<Lazy><ClientMembersPage /></Lazy>} />
          <Route path="client/:clientId/review" element={<Lazy><ClientReviewPage /></Lazy>} />
          <Route path="team" element={<Lazy><TeamPage /></Lazy>} />
          <Route path="settings/account" element={<Lazy><AccountSettingsPage /></Lazy>} />
          <Route path="settings/accounts" element={<Lazy><ConnectedAccountsPage /></Lazy>} />
          <Route path="settings/canva" element={<Lazy><CanvaSettingsPage /></Lazy>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/app/calendar" replace />} />
    </Routes>
  );
}
