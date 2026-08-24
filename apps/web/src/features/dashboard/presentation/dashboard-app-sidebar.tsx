import {
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  FileWarning,
  KeyRound,
  LayoutDashboard,
  Network,
  Package,
  ShieldCheck,
  Tags,
  Users,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../shared/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '../../../shared/ui/sidebar';
import type { AuthSession } from '../../auth/domain/auth';
import {
  getCompanyMemberships,
  hasTimesheetReadVisibility,
} from '../../auth/domain/auth';
import { TeamSwitcher } from '../../auth/presentation/components/team-switcher';
import { useSwitchActiveCompany } from '../../auth/presentation/use-auth';
import { useHrResponsibility } from '../../hr-responsibility/application/hr-responsibility-queries';
import { ActiveScopeSwitcher } from '../../org-tree/presentation/active-scope-switcher';
import { canViewAdminSignals } from '../domain/dashboard';

const workspaceItems = [
  { label: 'Inicio', href: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Artículos', href: '/dashboard/items', icon: Package },
  { label: 'Categorías', href: '/dashboard/categories', icon: Tags },
];

const hrItems = [
  { label: 'Empleados', href: '/manage-employees', icon: Users },
  {
    label: 'Puestos',
    href: '/dashboard/hr/positions',
    icon: BriefcaseBusiness,
  },
  { label: 'Acceso ERP', href: '/dashboard/hr/erp-access', icon: KeyRound },
  {
    label: 'Políticas de aprobación',
    href: '/dashboard/hr/approval-policies',
    icon: ShieldCheck,
  },
  {
    label: 'Timesheets',
    href: '/dashboard/hr/timesheets',
    icon: LayoutDashboard,
    isVisible: (session: AuthSession) =>
      Array.isArray(session.capabilities) && hasTimesheetReadVisibility(session),
  },
];

const sidebarItemClass =
  'hover:bg-black hover:text-white hover:pl-4 hover:rounded-2xl hover:[&>svg]:text-white data-[active=true]:bg-black data-[active=true]:text-white data-[active=true]:[&>svg]:text-white data-[active=true]:pl-4 data-[active=true]:rounded-2xl transition-[width,height,padding,color,background-color] transition-all duration-400 ease-in-out';

const sidebarParentItemClass =
  'hover:bg-neutral-700 hover:text-white hover:pl-4 hover:rounded-2xl hover:[&>svg]:text-white data-[active=true]:bg-neutral-700 data-[active=true]:text-white data-[active=true]:[&>svg]:text-white data-[active=true]:pl-4 data-[active=true]:rounded-2xl transition-[width,height,padding,color,background-color] transition-all duration-400 ease-in-out';

export const isHrNavigationActive = (pathname: string) =>
  pathname.startsWith('/dashboard/hr/') ||
  pathname === '/manage-employees' ||
  pathname === '/hr/responsibility';

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
  const { pathname } = useLocation();
  const isPlatformAdmin = canViewAdminSignals(session);
  const activeRole = session.activeCompany
    ? (session.memberships.find(
        (m) => m.companyId === session.activeCompany?.companyId,
      )?.role ?? null)
    : null;
  const isCompanyOwner = activeRole === 'company-owner';
  const canConfigureHr = isCompanyOwner || isPlatformAdmin;
  const { stateQuery: hrResponsibilityQuery } = useHrResponsibility(
    session.activeCompany?.status === 'active'
      ? session.activeCompany.companyId
      : undefined,
    apiBaseUrl,
  );
  const hasHrResponsibility = Boolean(
    hrResponsibilityQuery.data?.hasResponsibles,
  );
  const visibleHrItems = hrItems.filter(
    (item) => !('isVisible' in item) || item.isVisible(session),
  );
  const canViewHr = canConfigureHr || hasHrResponsibility;
  const canViewOrganization = canConfigureHr || hasHrResponsibility;
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
                  <NavLink to={item.href} {...(item.end ? { end: true } : {})}>
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
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {session.activeCompany && canViewHr ? (
          <SidebarGroup>
            <SidebarGroupLabel>Recursos Humanos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible
                  asChild
                  defaultOpen={
                    canConfigureHr ||
                    Boolean(hrResponsibilityQuery.data?.hasResponsibles)
                  }
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={sidebarParentItemClass}
                        tooltip="Recursos Humanos"
                        isActive={isHrNavigationActive(pathname)}
                      >
                        <Users />
                        <span className="cursor-pointer">Recursos Humanos</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {hasHrResponsibility
                          ? visibleHrItems.map((item) => (
                              <SidebarMenuSubItem key={item.href}>
                                <NavLink to={item.href} end>
                                  {({ isActive }) => (
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isActive}
                                      className={sidebarItemClass}
                                    >
                                      <span>
                                        <item.icon />
                                        <span>{item.label}</span>
                                      </span>
                                    </SidebarMenuSubButton>
                                  )}
                                </NavLink>
                              </SidebarMenuSubItem>
                            ))
                          : null}
                        {canConfigureHr ? (
                          <SidebarMenuSubItem>
                            <NavLink to="/dashboard/hr/responsibility" end>
                              {({ isActive }) => (
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive}
                                  className={sidebarItemClass}
                                >
                                  <span>
                                    <ShieldCheck />
                                    <span>Configurar responsables</span>
                                  </span>
                                </SidebarMenuSubButton>
                              )}
                            </NavLink>
                          </SidebarMenuSubItem>
                        ) : null}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {canViewOrganization ? (
          <SidebarGroup>
            <SidebarGroupLabel>Organización</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <NavLink to="/dashboard/organization">
                    {({ isActive }) => (
                      <SidebarMenuButton
                        className={sidebarItemClass}
                        asChild
                        tooltip="Organigrama"
                        isActive={isActive}
                      >
                        <span>
                          <Network />
                          <span>
                            {canConfigureHr ? 'Organigrama' : 'Organigrama'}
                          </span>
                        </span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

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

      {session.activeCompany ? (
        <SidebarFooter>
          <ActiveScopeSwitcher
            session={session}
            {...(apiBaseUrl ? { apiBaseUrl } : {})}
          />
        </SidebarFooter>
      ) : null}

      <SidebarRail />
    </Sidebar>
  );
};
