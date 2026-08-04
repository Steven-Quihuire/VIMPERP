import {
  Activity,
  ArrowUpRight,
  Bell,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card';
import type { AuthSession } from '../../auth/domain/auth';
import {
  adminWorkspaceLinks,
  canViewAdminSignals,
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
  const currentCompany = useDashboardCurrentCompany(
    apiBaseUrl,
    Boolean(session.activeCompany),
  );
  const summary = useDashboardSummary(apiBaseUrl, isPlatformAdmin);
  const notifications = useDashboardNotifications(apiBaseUrl, isPlatformAdmin);
  const companyLabel = getDashboardCompanyLabel(session, currentCompany.data);
  const companyDetail = getDashboardCompanyDetail(session, currentCompany.data);
  const notificationsList = notifications.data?.notifications ?? [];
  const newCompanyCount = notificationsList.filter(
    (notification) => notification.type === 'company.registered',
  ).length;
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(
      new Date(value),
    );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{companyLabel}</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            ERP dashboard
          </h1>
          <p className="text-sm text-muted-foreground">{companyDetail}</p>
        </div>
      </div>

      {isPlatformAdmin ? (
        <section className="grid gap-6">
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription>Administración de plataforma</CardDescription>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Todo bajo control
                </h2>
                <CardDescription className="mt-2 max-w-2xl">
                  Supervisa empresas, actividad operativa y señales técnicas
                  desde un solo lugar.
                </CardDescription>
              </div>
              <Link to="/dashboard/notifications">
                <Button variant="outline" size="sm" className="gap-2">
                  <Bell className="size-4" />
                  {newCompanyCount > 0
                    ? `${newCompanyCount} nuevas`
                    : 'Ver actividad'}
                </Button>
              </Link>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Lectura visual de la plataforma</CardDescription>
              <CardTitle>Actividad operativa</CardTitle>
              <CardDescription>
                Distribución actual de empresas, alertas y trazabilidad.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid h-48 grid-cols-3 items-end gap-6 rounded-lg border bg-muted/20 p-6">
                {[
                  {
                    label: 'Empresas',
                    value: summary.data?.totalCompanies ?? 0,
                    color: 'bg-primary',
                  },
                  {
                    label: 'Alertas',
                    value: summary.data?.notificationCount ?? 0,
                    color: 'bg-primary/70',
                  },
                  {
                    label: 'Auditoría',
                    value: summary.data?.auditEventCount ?? 0,
                    color: 'bg-primary/45',
                  },
                ].map((item) => {
                  const maxValue = Math.max(
                    summary.data?.totalCompanies ?? 0,
                    summary.data?.notificationCount ?? 0,
                    summary.data?.auditEventCount ?? 0,
                    1,
                  );
                  return (
                    <div
                      key={item.label}
                      className="flex h-full flex-col items-center justify-end gap-3"
                    >
                      <div
                        className={`w-full max-w-24 rounded-t-lg ${item.color} transition-all`}
                        style={{
                          height: `${Math.max((item.value / maxValue) * 100, 12)}%`,
                        }}
                        aria-label={`Actividad de ${item.label.toLowerCase()}`}
                      />
                      <span className="text-sm font-medium text-muted-foreground">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardDescription>Registro de actividad</CardDescription>
                  <CardTitle>Notificaciones recientes</CardTitle>
                </div>
                <Link
                  to="/dashboard/notifications"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver todas
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {notificationsList.slice(0, 4).map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <span className="rounded-md bg-muted p-2">
                      {notification.type === 'company.registered' ? (
                        <Building2 className="size-4" />
                      ) : (
                        <Bell className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    {notification.type === 'company.registered' ? (
                      <Badge variant="secondary">Nueva</Badge>
                    ) : null}
                  </div>
                ))}
                {notificationsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay actividad reciente.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="bg-red-400">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardDescription>Herramientas de plataforma</CardDescription>
                  <CardTitle>Centro de control</CardTitle>
                </div>
                <Activity className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                {adminWorkspaceLinks.map((link) => (
                  <Link
                    key={link.id}
                    to={link.href}
                    className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    <ShieldCheck className="size-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {link.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {link.description}
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : (
        <Card>
          <CardHeader>
            {session.activeCompany ? (
              <CardTitle>Company modules</CardTitle>
            ) : (
              <h1 className="text-3xl font-semibold tracking-tight">
                Selecciona una empresa
              </h1>
            )}
            <CardDescription>
              {session.activeCompany
                ? 'Pick a module from the sidebar to continue your ERP setup.'
                : 'Elige una empresa activa desde el selector lateral para continuar.'}
            </CardDescription>
          </CardHeader>
          <CardContent
            className={
              session.activeCompany ? 'grid gap-3 md:grid-cols-3' : 'space-y-2'
            }
          >
            {session.activeCompany ? (
              modules.map((module) => (
                <a
                  key={module.id}
                  href={`#${module.id}`}
                  aria-label={`Open ${module.label} module`}
                  className="flex items-center gap-3 rounded-lg border p-4 text-sm hover:bg-accent"
                >
                  <Building2 className="size-4" />
                  <span>{module.label}</span>
                </a>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Cambia de empresa para habilitar los módulos de trabajo y seguir
                con la operación diaria.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
