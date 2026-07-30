import type { CSSProperties } from 'react';
import { Bell } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';

import type { AuthSession } from '../../auth/domain/auth';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../shared/ui/breadcrumb';
import { Button } from '../../../shared/ui/button';
import { Separator } from '../../../shared/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '../../../shared/ui/sidebar';
import { DashboardAppSidebar } from './dashboard-app-sidebar';
import {
  getPrimaryMembership,
  getDashboardCompanyDetail,
  getDashboardCompanyLabel,
  getDashboardCurrentSection,
} from '../domain/dashboard';
import { useDashboardCurrentCompany } from './use-dashboard';

export const DashboardShell = ({
  session,
  apiBaseUrl,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
}) => {
  const location = useLocation();
  const currentSection = getDashboardCurrentSection(location.pathname);
  const primaryMembership = getPrimaryMembership(session);
  const currentCompany = useDashboardCurrentCompany(
    apiBaseUrl,
    Boolean(primaryMembership?.companyId),
  );
  const companyLabel = getDashboardCompanyLabel(session, currentCompany.data);
  const companyDetail = getDashboardCompanyDetail(session, currentCompany.data);

  return (
    <SidebarProvider
      defaultOpen
      style={{
        '--sidebar-width': '14rem',
        '--sidebar-width-icon': '3.25rem',
      } as CSSProperties}
    >
      <DashboardAppSidebar
        session={session}
        companyLabel={companyLabel}
        companyDetail={companyDetail}
        {...(apiBaseUrl ? { apiBaseUrl } : {})}
      />
      <SidebarInset className="h-dvh max-h-dvh overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-sidebar px-4 text-sidebar-foreground lg:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem className="hidden md:block">{companyLabel}</BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentSection}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs text-muted-foreground md:block">
              <p>{companyDetail}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Notificaciones">
              <Bell />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
