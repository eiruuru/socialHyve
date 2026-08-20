import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { AppLayout } from './AppLayout';
import { AppIndexRedirect } from './AppIndexRedirect';
import { DeviceRouteGuard } from './DeviceRouteGuard';
import { WorkspaceProvider } from '@/lib/WorkspaceContext';
import { ClientProvider } from '@/lib/clientContext';
import { MembershipProvider } from '@/lib/membershipContext';
import { ClientOnlyRedirect } from './ClientOnlyRedirect';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { RequirePlatformAdmin } from './RequirePlatformAdmin';
import { lazyWithRetry } from './lazyWithRetry';
import { PostPageSwitch } from './PostPageSwitch';

const LoginPage = lazyWithRetry(() => import('@/pages/LoginPage'));
const CalendarPage = lazyWithRetry(() => import('@/pages/CalendarPage'));
const QueuePage = lazyWithRetry(() => import('@/pages/QueuePage'));
const PostComposerPage = lazyWithRetry(() => import('@/pages/PostComposerPage'));
const PostImportPage = lazyWithRetry(() => import('@/pages/PostImportPage'));
const InteractionsPage = lazyWithRetry(() => import('@/pages/InteractionsPage'));
const MetaConnectionPage = lazyWithRetry(() => import('@/pages/MetaConnectionPage'));
const ConnectedAccountsPage = lazyWithRetry(() => import('@/pages/ConnectedAccountsPage'));
const CanvaSettingsPage = lazyWithRetry(() => import('@/pages/CanvaSettingsPage'));
const AccountSettingsPage = lazyWithRetry(() => import('@/pages/AccountSettingsPage'));
const ClientsPage = lazyWithRetry(() => import('@/pages/ClientsPage'));
const TeamPage = lazyWithRetry(() => import('@/pages/TeamPage'));
const ClientMembersPage = lazyWithRetry(() => import('@/pages/ClientMembersPage'));
const ClientReviewPage = lazyWithRetry(() => import('@/pages/ClientReviewPage'));
const HelpPage = lazyWithRetry(() => import('@/pages/HelpPage'));
const AdminLayout = lazyWithRetry(() => import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazyWithRetry(() => import('@/pages/admin/AdminDashboardPage'));
const AdminWaitlistPage = lazyWithRetry(() => import('@/pages/admin/AdminWaitlistPage'));
const AdminOrganizationsPage = lazyWithRetry(() => import('@/pages/admin/AdminOrganizationsPage'));
const AdminOrganizationDetailPage = lazyWithRetry(() => import('@/pages/admin/AdminOrganizationDetailPage'));
const AdminUsersPage = lazyWithRetry(() => import('@/pages/admin/AdminUsersPage'));
const AdminUserDetailPage = lazyWithRetry(() => import('@/pages/admin/AdminUserDetailPage'));
const AdminClientMembersPage = lazyWithRetry(() => import('@/pages/admin/AdminClientMembersPage'));
const AdminUserPreviewRedirect = lazyWithRetry(() => import('@/pages/admin/AdminUserPreviewRedirect'));

function Lazy({ children }) {
  return (
    <Suspense fallback={<EmptyHiveState title="Loading the hive…" compact />}>
      {children}
    </Suspense>
  );
}

function Guarded({ children }) {
  return <DeviceRouteGuard>{children}</DeviceRouteGuard>;
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
          <Route index element={<AppIndexRedirect />} />
          <Route path="queue" element={<Lazy><QueuePage /></Lazy>} />
          <Route path="calendar" element={<Lazy><Guarded><CalendarPage /></Guarded></Lazy>} />
          <Route path="interactions" element={<Lazy><Guarded><InteractionsPage /></Guarded></Lazy>} />
          <Route path="posts/new" element={<Lazy><PostComposerPage /></Lazy>} />
          <Route path="posts/import" element={<Lazy><Guarded><PostImportPage /></Guarded></Lazy>} />
          <Route path="posts/:id/*" element={<Lazy><PostPageSwitch /></Lazy>} />
          <Route path="clients" element={<Lazy><Guarded><ClientsPage /></Guarded></Lazy>} />
          <Route path="clients/:clientId/members" element={<Lazy><Guarded><ClientMembersPage /></Guarded></Lazy>} />
          <Route path="client/:clientId/review" element={<Lazy><ClientReviewPage /></Lazy>} />
          <Route path="team" element={<Lazy><Guarded><TeamPage /></Guarded></Lazy>} />
          <Route path="settings/account" element={<Lazy><AccountSettingsPage /></Lazy>} />
          <Route path="settings/meta" element={<Lazy><Guarded><MetaConnectionPage /></Guarded></Lazy>} />
          <Route path="settings/accounts" element={<Lazy><Guarded><ConnectedAccountsPage /></Guarded></Lazy>} />
          <Route path="settings/canva" element={<Lazy><Guarded><CanvaSettingsPage /></Guarded></Lazy>} />
          <Route path="help" element={<Lazy><Guarded><HelpPage /></Guarded></Lazy>} />
          <Route path="admin" element={<RequirePlatformAdmin />}>
            <Route element={<Lazy><AdminLayout /></Lazy>}>
              <Route index element={<Lazy><AdminDashboardPage /></Lazy>} />
              <Route path="waitlist" element={<Lazy><AdminWaitlistPage /></Lazy>} />
              <Route path="organizations" element={<Lazy><AdminOrganizationsPage /></Lazy>} />
              <Route path="organizations/:orgId" element={<Lazy><AdminOrganizationDetailPage /></Lazy>} />
              <Route path="organizations/:orgId/clients/:clientId/members" element={<Lazy><AdminClientMembersPage /></Lazy>} />
              <Route path="users" element={<Lazy><AdminUsersPage /></Lazy>} />
              <Route path="users/:userId" element={<Lazy><AdminUserDetailPage /></Lazy>} />
              <Route path="users/:userId/preview" element={<Lazy><AdminUserPreviewRedirect /></Lazy>} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/app/queue" replace />} />
    </Routes>
  );
}
