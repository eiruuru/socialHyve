import { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginRedirect } from '@/app/LoginRedirect';
import { RequireAuth } from '@/app/RequireAuth';
import { AppShell } from '@/app/AppShell';
import { AppIndexRedirect } from '@/app/AppIndexRedirect';
import { DeviceRouteGuard } from '@/app/DeviceRouteGuard';
import { RequirePlatformAdmin } from '@/app/RequirePlatformAdmin';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { lazyWithRetry } from '@/app/lazyWithRetry';

const LandingPage = lazyWithRetry(() => import('@/pages/LandingPage'));
const FaqPage = lazyWithRetry(() => import('@/pages/FaqPage'));
const ReviewLinkPage = lazyWithRetry(() => import('@/pages/ReviewLinkPage'));
const ShortLinkRedirectPage = lazyWithRetry(() => import('@/pages/ShortLinkRedirectPage'));
const WaitlistPage = lazyWithRetry(() => import('@/pages/WaitlistPage'));
const PricingPage = lazyWithRetry(() => import('@/pages/PricingPage'));
const PrivacyPage = lazyWithRetry(() => import('@/pages/PrivacyPage'));
const TermsPage = lazyWithRetry(() => import('@/pages/TermsPage'));
const AcceptableUsePage = lazyWithRetry(() => import('@/pages/AcceptableUsePage'));
const MarketingCapturePage = lazyWithRetry(() => import('@/pages/MarketingCapturePage'));
const LoginPage = lazyWithRetry(() => import('@/pages/LoginPage'));
const CalendarPage = lazyWithRetry(() => import('@/pages/CalendarPage'));
const QueuePage = lazyWithRetry(() => import('@/pages/QueuePage'));
const PostComposerPage = lazyWithRetry(() => import('@/pages/PostComposerPage'));
const PostImportPage = lazyWithRetry(() => import('@/pages/PostImportPage'));
const PostPageSwitch = lazyWithRetry(() => import('@/app/PostPageSwitch').then((m) => ({ default: m.PostPageSwitch })));
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

function lazyElement(Component) {
  return (
    <Lazy>
      <Component />
    </Lazy>
  );
}

function guardedElement(Component) {
  return (
    <Lazy>
      <Guarded>
        <Component />
      </Guarded>
    </Lazy>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: lazyElement(LandingPage) },
  { path: '/faq', element: lazyElement(FaqPage) },
  { path: '/waitlist', element: lazyElement(WaitlistPage) },
  { path: '/pricing', element: lazyElement(PricingPage) },
  { path: '/privacy', element: lazyElement(PrivacyPage) },
  { path: '/terms', element: lazyElement(TermsPage) },
  { path: '/acceptable-use', element: lazyElement(AcceptableUsePage) },
  { path: '/login', element: <LoginRedirect /> },
  { path: '/review/:token', element: lazyElement(ReviewLinkPage) },
  { path: '/s/:slug', element: lazyElement(ShortLinkRedirectPage) },
  { path: '/__marketing-capture', element: lazyElement(MarketingCapturePage) },
  {
    path: '/app',
    children: [
      { path: 'login', element: lazyElement(LoginPage) },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <AppIndexRedirect /> },
              { path: 'queue', element: lazyElement(QueuePage) },
              { path: 'calendar', element: guardedElement(CalendarPage) },
              { path: 'interactions', element: guardedElement(InteractionsPage) },
              { path: 'posts/new', element: lazyElement(PostComposerPage) },
              { path: 'posts/import', element: guardedElement(PostImportPage) },
              { path: 'posts/:id/*', element: lazyElement(PostPageSwitch) },
              { path: 'clients', element: guardedElement(ClientsPage) },
              { path: 'clients/:clientId/members', element: guardedElement(ClientMembersPage) },
              { path: 'client/:clientId/review', element: lazyElement(ClientReviewPage) },
              { path: 'team', element: guardedElement(TeamPage) },
              { path: 'settings/account', element: lazyElement(AccountSettingsPage) },
              { path: 'settings/meta', element: guardedElement(MetaConnectionPage) },
              { path: 'settings/accounts', element: guardedElement(ConnectedAccountsPage) },
              { path: 'settings/canva', element: guardedElement(CanvaSettingsPage) },
              { path: 'help', element: guardedElement(HelpPage) },
              {
                path: 'admin',
                element: <RequirePlatformAdmin />,
                children: [
                  {
                    element: lazyElement(AdminLayout),
                    children: [
                      { index: true, element: lazyElement(AdminDashboardPage) },
                      { path: 'waitlist', element: lazyElement(AdminWaitlistPage) },
                      { path: 'organizations', element: lazyElement(AdminOrganizationsPage) },
                      { path: 'organizations/:orgId', element: lazyElement(AdminOrganizationDetailPage) },
                      {
                        path: 'organizations/:orgId/clients/:clientId/members',
                        element: lazyElement(AdminClientMembersPage),
                      },
                      { path: 'users', element: lazyElement(AdminUsersPage) },
                      { path: 'users/:userId', element: lazyElement(AdminUserDetailPage) },
                      { path: 'users/:userId/preview', element: lazyElement(AdminUserPreviewRedirect) },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/app/queue" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
