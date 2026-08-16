import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { AppLayout } from './AppLayout';
import { WorkspaceProvider } from '@/lib/WorkspaceContext';
import { ClientProvider } from '@/lib/clientContext';
import { MembershipProvider } from '@/lib/membershipContext';
import { ClientOnlyRedirect } from './ClientOnlyRedirect';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { lazyWithRetry } from './lazyWithRetry';

const LoginPage = lazyWithRetry(() => import('@/pages/LoginPage'));
const CalendarPage = lazyWithRetry(() => import('@/pages/CalendarPage'));
const QueuePage = lazyWithRetry(() => import('@/pages/QueuePage'));
const PostComposerPage = lazyWithRetry(() => import('@/pages/PostComposerPage'));
const PostImportPage = lazyWithRetry(() => import('@/pages/PostImportPage'));
const EditPostPage = lazyWithRetry(() => import('@/pages/EditPostPage'));
const PostDetailPage = lazyWithRetry(() => import('@/pages/PostDetailPage'));
const MetaConnectionPage = lazyWithRetry(() => import('@/pages/MetaConnectionPage'));
const ConnectedAccountsPage = lazyWithRetry(() => import('@/pages/ConnectedAccountsPage'));
const CanvaSettingsPage = lazyWithRetry(() => import('@/pages/CanvaSettingsPage'));
const AccountSettingsPage = lazyWithRetry(() => import('@/pages/AccountSettingsPage'));
const ClientsPage = lazyWithRetry(() => import('@/pages/ClientsPage'));
const TeamPage = lazyWithRetry(() => import('@/pages/TeamPage'));
const ClientMembersPage = lazyWithRetry(() => import('@/pages/ClientMembersPage'));
const ClientReviewPage = lazyWithRetry(() => import('@/pages/ClientReviewPage'));
const HelpPage = lazyWithRetry(() => import('@/pages/HelpPage'));

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
          <Route path="settings/meta" element={<Lazy><MetaConnectionPage /></Lazy>} />
          <Route path="settings/accounts" element={<Lazy><ConnectedAccountsPage /></Lazy>} />
          <Route path="settings/canva" element={<Lazy><CanvaSettingsPage /></Lazy>} />
          <Route path="help" element={<Lazy><HelpPage /></Lazy>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/app/calendar" replace />} />
    </Routes>
  );
}
