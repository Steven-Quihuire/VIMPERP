import {
  Boxes,
  Building2,
  ClipboardList,
  FileWarning,
  LayoutDashboard,
  Package,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

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
import type { AuthSession } from '../../auth/domain/auth';
import { getCompanyMemberships } from '../../auth/domain/auth';
import { TeamSwitcher } from '../../auth/presentation/components/team-switcher';
import { useSwitchActiveCompany } from '../../auth/presentation/use-auth';
import { canViewAdminSignals } from '../domain/dashboard';

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

const isHashLink = (href: string) => href.startsWith('#');

const sidebarItemClass =
  'hover:bg-black hover:text-white hover:pl-4 hover:rounded-2xl data-[active=true]:bg-black data-[active=true]:text-white data-[active=true]:pl-4 data-[active=true]:rounded-2xl transition-[width,height,padding,color,background-color] transition-all duration-400 ease-in-out';

const getRoleLabel = (role: AuthSession['memberships'][number]['role']) => {
  switch (role) {
    case 'company-owner':
      return 'Responsable de empresa';
    case 'company-user':
      return 'Usuario de empresa';
    case 'platform-admin':
      return 'Administrador de plataformas';
  }
};

export const DashboardAppSidebar = ({
  session,
  companyLabel,
  companyDetail,
  apiBaseUrl,
}: {
  session: AuthSession;
  companyLabel: string;
  companyDetail: string;
  apiBaseUrl?: string;
}) => {
  const isPlatformAdmin = canViewAdminSignals(session);
  const switchActiveCompany = useSwitchActiveCompany(apiBaseUrl);
  const companyMemberships = getCompanyMemberships(session);
  const companyOptions = companyMemberships.map((membership, index) => ({
    companyId: membership.companyId,
    name:
      session.activeCompany?.companyId === membership.companyId
        ? companyLabel
        : `Empresa ${index + 1}`,
    roleLabel:
      session.activeCompany?.companyId === membership.companyId
        ? companyDetail
        : getRoleLabel(membership.role),
    status:
      session.activeCompany?.companyId === membership.companyId
        ? session.activeCompany.status
        : 'active',
    isActive: session.activeCompany?.companyId === membership.companyId,
  }));

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        {companyOptions.length > 0 ? (
          <TeamSwitcher
            teams={companyOptions}
            isPending={switchActiveCompany.isPending}
            onSelect={(companyId) => switchActiveCompany.mutate({ companyId })}
          />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="font-semibold">
                <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                  <Building2 size={18} />
                </span>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">{companyLabel}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Área de trabajo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  {isHashLink(item.href) ? (
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      className={sidebarItemClass}
                    >
                      <a href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  ) : (
                    <NavLink
                      to={item.href}
                      {...(item.end ? { end: true } : {})}
                    >
                      {({ isActive }) => (
                        <SidebarMenuButton
                          className={sidebarItemClass}
                          asChild
                          tooltip={item.label}
                          isActive={isActive}
                        >
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
                      <SidebarMenuButton
                        className={sidebarItemClass}
                        asChild
                        tooltip="Observabilidad"
                        isActive={isActive}
                      >
                        <span>
                          <FileWarning />
                          <span>Observabilidad</span>
                        </span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <NavLink to="/dashboard/admin/companies">
                    {({ isActive }) => (
                      <SidebarMenuButton
                        asChild
                        tooltip="Empresas"
                        isActive={isActive}
                        className={sidebarItemClass}
                      >
                        <span>
                          <Building2 />
                          <span>Empresas</span>
                        </span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
};
