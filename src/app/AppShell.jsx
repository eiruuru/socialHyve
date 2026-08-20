import { WorkspaceProvider } from '@/lib/WorkspaceContext';
import { ClientProvider } from '@/lib/clientContext';
import { MembershipProvider } from '@/lib/membershipContext';
import { ClientOnlyRedirect } from './ClientOnlyRedirect';
import { AppLayout } from './AppLayout';

export function AppShell() {
  return (
    <WorkspaceProvider>
      <ClientProvider>
        <MembershipProvider>
          <ClientOnlyRedirect />
          <AppLayout />
        </MembershipProvider>
      </ClientProvider>
    </WorkspaceProvider>
  );
}
