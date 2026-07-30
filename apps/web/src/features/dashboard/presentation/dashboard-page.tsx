import { Bell, Building2, ShieldCheck } from 'lucide-react';

import type { AuthSession } from '../../auth/domain/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card';
import { Button } from '../../../shared/ui/button';
import {
  adminWorkspaceLinks,
  canViewAdminSignals,
  getPrimaryMembership,
  getDashboardCompanyDetail,
  getDashboardCompanyLabel,
  getVisibleDashboardModules,
} from '../domain/dashboard';
import {
  useDashboardCurrentCompany,
  useDashboardNotifications,
  useDashboardSummary,
} from './use-dashboard';

export const DashboardPage = ({
  session,
  apiBaseUrl,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
}) => {
  const isPlatformAdmin = canViewAdminSignals(session);
  const modules = getVisibleDashboardModules(session);
  const primaryMembership = getPrimaryMembership(session);
  const currentCompany = useDashboardCurrentCompany(
    apiBaseUrl,
    Boolean(primaryMembership?.companyId),
  );
  const summary = useDashboardSummary(apiBaseUrl, isPlatformAdmin);
  const notifications = useDashboardNotifications(apiBaseUrl, isPlatformAdmin);
  const companyLabel = getDashboardCompanyLabel(session, currentCompany.data);
  const companyDetail = getDashboardCompanyDetail(session, currentCompany.data);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{companyLabel}</p>
          <h1 className="text-3xl font-semibold tracking-tight">ERP dashboard</h1>
          <p className="text-sm text-muted-foreground">{companyDetail}</p>
        </div>
        <div className="text-sm text-muted-foreground">{session.user.email}</div>
      </div>

      {isPlatformAdmin ? (
        <section className="grid gap-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription>Platform overview</CardDescription>
                <h2 className="text-2xl font-semibold tracking-tight">Platform overview</h2>
                <CardDescription>Seguimiento de companias, alertas y eventos auditables del sistema.</CardDescription>
              </div>
              <Button variant="outline" size="sm">{notifications.data?.notifications.length ?? 0} alertas activas</Button>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Total companies</CardDescription>
                <CardTitle className="text-3xl">{summary.data?.totalCompanies ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Empresas activas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Operational notifications</CardDescription>
                <CardTitle className="text-3xl">{summary.data?.notificationCount ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Requieren atencion</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Audit events</CardDescription>
                <CardTitle className="text-3xl">{summary.data?.auditEventCount ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Eventos registrados</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_.9fr]">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardDescription>Actividad</CardDescription>
                  <CardTitle>Notificaciones recientes</CardTitle>
                </div>
                <Bell className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                {notifications.data?.notifications.map((notification) => (
                  <div key={notification.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <span className="rounded-md bg-muted p-2">
                      <Bell className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{notification.type}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardDescription>Accesos rapidos</CardDescription>
                  <CardTitle>Observability workspace</CardTitle>
                </div>
                <ShieldCheck className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                {adminWorkspaceLinks.map((link) => (
                  <a key={link.id} href={link.href} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-accent">
                    <span>{link.label}</span>
                    <span aria-hidden="true">→</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Company modules</CardTitle>
            <CardDescription>Pick a module from the sidebar to continue your ERP setup.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {modules.map((module) => (
              <a
                key={module.id}
                href={`#${module.id}`}
                aria-label={`Open ${module.label} module`}
                className="flex items-center gap-3 rounded-lg border p-4 text-sm hover:bg-accent"
              >
                <Building2 className="size-4" />
                <span>{module.label}</span>
              </a>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
};
