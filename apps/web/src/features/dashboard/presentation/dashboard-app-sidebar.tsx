import {
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  FileWarning,
  LayoutDashboard,
  Package,
  ShieldUser,
  Settings,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import type { AuthSession } from '../../auth/domain/auth';
import { canViewAdminSignals } from '../domain/dashboard';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '../../../shared/ui/sidebar';

const workspaceItems = [
  { label: 'Inicio', href: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Sales', href: '#sales', icon: ClipboardList },
  { label: 'Compras', href: '#purchases', icon: Building2 },
  { label: 'Items', href: '/dashboard/items', icon: Package },
  { label: 'Categorías', href: '/dashboard/categories', icon: Tags },
  { label: 'Produccion', href: '#production', icon: Boxes },
  { label: 'Finanzas', href: '#finance', icon: ShieldCheck },
  { label: 'Proyectos', href: '#projects', icon: ClipboardList },
];

const accountItems = [
  { label: 'Notificaciones', href: '#notifications', icon: Bell },
  { label: 'Perfil', href: '/dashboard/settings/profile', icon: ShieldUser },
  { label: 'Configuracion', href: '/dashboard/settings/theme', icon: Settings },
];

const isHashLink = (href: string) => href.startsWith('#');

export const DashboardAppSidebar = ({
  session,
  companyLabel,
  companyDetail,
}: {
  session: AuthSession;
  companyLabel: string;
  companyDetail: string;
  apiBaseUrl?: string;
}) => {
  const isPlatformAdmin = canViewAdminSignals(session);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="font-semibold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                V
              </span>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{companyLabel}</span>
                <span className="truncate text-xs text-muted-foreground">{companyDetail}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  {isHashLink(item.href) ? (
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <a href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  ) : (
                    <NavLink to={item.href} {...(item.end ? { end: true } : {})}>
                      {({ isActive }) => (
                        <SidebarMenuButton asChild tooltip={item.label} isActive={isActive}>
                          <span>
                            <item.icon />
                            <span>{item.label}</span>
                          </span>
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isPlatformAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <NavLink to="/dashboard/admin/provisioning-runs">
                    {({ isActive }) => (
                      <SidebarMenuButton asChild tooltip="Observabilidad" isActive={isActive}>
                        <span>
                          <FileWarning />
                          <span>Observabilidad</span>
                        </span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  {isHashLink(item.href) ? (
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <a href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  ) : (
                    <NavLink to={item.href}>
                      {({ isActive }) => (
                        <SidebarMenuButton asChild tooltip={item.label} isActive={isActive}>
                          <span>
                            <item.icon />
                            <span>{item.label}</span>
                          </span>
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
};
