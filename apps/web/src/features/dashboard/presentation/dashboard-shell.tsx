import {
  Bell,
  ChevronRight,
  CircleHelp,
  LogOut,
  Monitor,
  Settings,
  UserRound,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback } from '../../../shared/ui/avatar';
import { Button } from '../../../shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../shared/ui/dropdown-menu';
import { Separator } from '../../../shared/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '../../../shared/ui/sidebar';
import type { AuthSession } from '../../auth/domain/auth';
import { useLogout } from '../../auth/presentation/use-auth';
import {
  canViewAdminSignals,
  getDashboardCompanyDetail,
  getDashboardCompanyLabel,
} from '../domain/dashboard';
import { DashboardAppSidebar } from './dashboard-app-sidebar';
import {
  getReadNotificationIds,
  useDashboardCurrentCompany,
  useDashboardNotifications,
  useNotificationReadVersion,
} from './use-dashboard';

const getCompanyInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'V';

export const DashboardShell = ({
  session,
  apiBaseUrl,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
}) => {
  const currentCompany = useDashboardCurrentCompany(
    apiBaseUrl,
    Boolean(session.activeCompany),
  );
  const navigate = useNavigate();
  const companyLabel = getDashboardCompanyLabel(session, currentCompany.data);
  const companyDetail = getDashboardCompanyDetail(session, currentCompany.data);
  const logout = useLogout(apiBaseUrl);
  const notifications = useDashboardNotifications(
    apiBaseUrl,
    canViewAdminSignals(session),
  );
  useNotificationReadVersion();
  const readNotificationIds = getReadNotificationIds();
  const newCompanyCount =
    notifications.data?.notifications.filter(
      (notification) =>
        notification.type === 'company.registered' &&
        !readNotificationIds.has(notification.id),
    ).length ?? 0;
  const companyName = currentCompany.data?.name ?? companyLabel;
  const companyInitials = getCompanyInitials(companyName);
  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        void navigate('/login', { replace: true });
      },
    });
  };

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          '--sidebar-width': '14rem',
          '--sidebar-width-icon': '3.25rem',
        } as CSSProperties
      }
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
          </div>
          <div className="flex items-center gap-2">
            <NavLink
              to="/dashboard/notifications"
              aria-label="Abrir notificaciones"
            >
              {({ isActive }) => (
                <Button
                  className={`relative w-8 h-auto rounded-full cursor-pointer transition-all ease-in-out duration-[400ms] ${
                    isActive
                      ? 'bg-black text-white'
                      : 'bg-[#eee] text-black hover:bg-black hover:text-white'
                  }`}
                  aria-label="Notificaciones"
                >
                  <Bell size={30} />
                  {newCompanyCount > 0 ? (
                    <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-red-500" />
                  ) : null}
                </Button>
              )}
            </NavLink>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  className="rounded-full p-0 cursor-pointer"
                  aria-label={`Abrir menú de ${companyName}`}
                >
                  <Avatar
                    size="default"
                    className="size-8 bg-primary text-primary-foreground"
                  >
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                      {companyInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-80 rounded-xl p-2"
              >
                <div className="flex items-center gap-3 px-2 py-2">
                  <Avatar className="size-10 bg-primary text-primary-foreground">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {companyInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {companyName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Cuenta de empresa
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  asChild
                  className="h-11 gap-3 rounded-lg px-2 cursor-pointer"
                >
                  <Link to="/dashboard/settings/profile">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                      <UserRound className="size-4" />
                    </span>
                    <span className="flex-1">Configuración de perfil</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="h-11 gap-3 rounded-lg px-2 cursor-pointer"
                >
                  <Link to="/privacy-policy">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                      <Settings className="size-4" />
                    </span>
                    <span className="flex-1">Configuración y privacidad</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="h-11 gap-3 rounded-lg px-2 cursor-pointer"
                >
                  <a href="mailto:soporte@vimcore.app">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                      <CircleHelp className="size-4" />
                    </span>
                    <span className="flex-1">Ayuda y asistencia</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="h-11 gap-3 rounded-lg px-2 cursor-pointer"
                >
                  <Link to="/dashboard/settings/theme">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                      <Monitor className="size-4" />
                    </span>
                    <span className="flex-1">Pantalla y accesibilidad</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="h-11 gap-3 rounded-full px-2 cursor-pointer focus:pl-5 focus:bg-black focus:text-white focus:[&_svg]:text-white! transition-all ease-in-out duration-400"
                  onSelect={handleLogout}
                >
                  <span className="flex size-8 items-center justify-center rounded-full">
                    <LogOut className="size-4" />
                  </span>
                  <span className="flex-1">Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
