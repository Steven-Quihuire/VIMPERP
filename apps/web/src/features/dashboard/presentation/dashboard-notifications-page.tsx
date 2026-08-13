import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import { Bell, Building2, CircleAlert } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Badge } from '../../../shared/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card';
import { notificationsWorkspaceLinks } from '../domain/dashboard';
import {
  markNotificationsAsRead,
  getReadNotificationIds,
  useDashboardNotifications,
  useNotificationReadVersion,
} from './use-dashboard';

const formatDate = (value: string) => {
  const formatted = new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

  return `Creada el ${formatted}`;
};

export const DashboardNotificationsPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const notifications = useDashboardNotifications(apiBaseUrl, true, 'user');
  const location = useLocation();
  const readVersion = useNotificationReadVersion();
  const view = location.pathname.endsWith('/unread')
    ? 'unread'
    : location.pathname.endsWith('/all')
      ? 'all'
      : 'recent';
  const items = useMemo(() => {
    const allItems = notifications.data?.notifications ?? [];
    const readIds = getReadNotificationIds();

    return allItems.filter((notification) => {
      if (view === 'unread') {
        return readVersion >= 0 && !readIds.has(notification.id);
      }
      if (view === 'all') return true;

      return Date.parse(notification.createdAt) >= Date.now() - 24 * 60 * 60 * 1000;
    });
  }, [notifications.data?.notifications, readVersion, view]);

  useEffect(() => {
    if (view !== 'unread') {
      markNotificationsAsRead(items.map((notification) => notification.id));
    }
  }, [items, view]);

  const titles = {
    recent: {
      title: 'Actividad reciente',
      description: 'Eventos de las últimas 24 horas',
    },
    all: {
      title: 'Todas las notificaciones',
      description: 'Historial completo de eventos de la plataforma',
    },
    unread: {
      title: 'Notificaciones sin leer',
      description: 'Eventos que todavía no has revisado',
    },
  } as const;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-medium tracking-tight">
          Centro de notificación
        </h1>
        <Breadcrumb className="mt-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  className="text-gray-500 text-xs hover:text-gray-700 transition-all ease-in-out duration-300"
                  to="/dashboard"
                >
                  Inicio
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-gray-800 text-xs">
                Notificaciones
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <AdminWorkspaceNav />

      <Card>
        <CardHeader>
          <CardTitle>{titles[view].title}</CardTitle>
          <CardDescription>{titles[view].description}</CardDescription>
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
              <p className="font-medium">
                {view === 'unread'
                  ? 'No hay notificaciones sin leer'
                  : 'No hay notificaciones para mostrar'}
              </p>
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
                <p className="mt-1 text-sm text-muted-foreground">
                  {notification.type}
                </p>
                <time
                  className="mt-2 block text-xs text-muted-foreground"
                  dateTime={notification.createdAt}
                >
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

export const AdminWorkspaceNav = () => (
  <nav aria-label="Navegación de administración" className="overflow-x-auto">
    <ul className="flex min-w-max gap-6 text-sm">
      {notificationsWorkspaceLinks.map((link) => (
        <li key={link.id}>
          <NavLink
            className={({ isActive }) =>
              `inline-flex h-8 items-center whitespace-nowrap border-b-2 px-1 font-medium transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`
            }
            end={link.id === 'notifications'}
            to={link.href}
          >
            {link.label}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
