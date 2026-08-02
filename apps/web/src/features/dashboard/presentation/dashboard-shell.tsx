import type { CSSProperties } from 'react';
import { Bell } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

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
  canViewAdminSignals,
  getPrimaryMembership,
  getDashboardCompanyDetail,
  getDashboardCompanyLabel,
  getDashboardCurrentSection,
} from '../domain/dashboard';
import { getReadNotificationIds, useDashboardCurrentCompany, useDashboardNotifications, useNotificationReadVersion } from './use-dashboard';

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
  const notifications = useDashboardNotifications(apiBaseUrl, canViewAdminSignals(session));
  useNotificationReadVersion();
  const readNotificationIds = getReadNotificationIds();
  const newCompanyCount = notifications.data?.notifications.filter(
    (notification) => notification.type === 'company.registered' && !readNotificationIds.has(notification.id),
  ).length ?? 0;

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
            <Link to="/dashboard/notifications" aria-label="Abrir notificaciones">
              <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
                <Bell />
                {newCompanyCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500" />
                ) : null}
              </Button>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
