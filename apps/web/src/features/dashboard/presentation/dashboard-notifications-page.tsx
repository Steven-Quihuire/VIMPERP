import { useEffect } from 'react';
import { Bell, Building2, CircleAlert } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';
import type { AuthSession } from '../../auth/domain/auth';
import { canViewAdminSignals } from '../domain/dashboard';
import { markNotificationsAsRead, useDashboardNotifications } from './use-dashboard';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const DashboardNotificationsPage = ({
  session,
  apiBaseUrl,
}: {
  session?: AuthSession;
  apiBaseUrl?: string;
}) => {
  const isPlatformAdmin = session ? canViewAdminSignals(session) : true;
  const notifications = useDashboardNotifications(apiBaseUrl, isPlatformAdmin);
  const items = notifications.data?.notifications ?? [];

  useEffect(() => {
    markNotificationsAsRead(items.map((notification) => notification.id));
  }, [items]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Centro de actividad</p>
          <h1 className="text-3xl font-semibold tracking-tight">Notificaciones</h1>
          <p className="mt-1 text-muted-foreground">
            Revisa los eventos que requieren atención de la plataforma.
          </p>
        </div>
        <div className="rounded-full border bg-card p-3 shadow-sm">
          <Bell className="size-5" />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
          <CardDescription>Eventos recientes de la plataforma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.isLoading ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Cargando notificaciones...
            </div>
          ) : null}

          {!notifications.isLoading && items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <CircleAlert className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="font-medium">No hay notificaciones nuevas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Aquí aparecerán los eventos importantes del sistema.
              </p>
            </div>
          ) : null}

          {items.map((notification) => (
            <article
              key={notification.id}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <span className="rounded-lg bg-muted p-2.5">
                {notification.type === 'company.registered' ? (
                  <Building2 className="size-4" />
                ) : (
                  <Bell className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{notification.message}</p>
                  {notification.type === 'company.registered' ? (
                    <Badge variant="secondary">Nueva empresa</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notification.type}</p>
                <time className="mt-2 block text-xs text-muted-foreground" dateTime={notification.createdAt}>
                  {formatDate(notification.createdAt)}
                </time>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
};
