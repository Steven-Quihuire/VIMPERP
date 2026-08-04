import type {
  AuthMembership,
  AuthSession,
  CompanyLifecycle,
} from '../../auth/domain/auth';
import { getCompanyMemberships } from '../../auth/domain/auth';

export type DashboardModule = {
  id: string;
  label: string;
};

const dashboardRoleLabels: Record<
  AuthSession['memberships'][number]['role'],
  string
> = {
  'platform-admin': 'Panel administrador',
  'company-owner': 'Responsable de empresa',
  'company-user': 'Usuario de empresa',
};

export type DashboardCompanySummary = {
  totalCompanies: number;
  notificationCount: number;
  auditEventCount: number;
  companies: Array<{
    id: string;
    name: string;
    createdAt: string;
    legalIdentifier?: string;
    services?: string[];
    country?: string;
    city?: string;
    exactLocation?: string;
    contactPhone?: string;
    contactEmail?: string;
    erpModuleId?: string;
  }>;
};

export type DashboardCurrentCompanySummary = {
  companyId: string;
  name: string;
};

export type BlockedCompanyViewModel = {
  status: 'suspended' | 'provisioning_failed';
  title: string;
  body: string;
  supportHref: string;
};

export type DashboardNotification = {
  id: string;
  companyId: string;
  targetRole: string;
  type: string;
  message: string;
  createdAt: string;
};

export type AdminWorkspaceLink = {
  id: 'companies' | 'provisioning-runs' | 'application-errors' | 'audit-events';
  label: string;
  href: string;
  description: string;
};

const baseModules: DashboardModule[] = [
  { id: 'crm', label: 'CRM' },
  { id: 'sales', label: 'Sales' },
  { id: 'inventory', label: 'Inventory' },
];

const platformAdminModules: DashboardModule[] = [
  { id: 'platform-overview', label: 'Resumen de plataforma' },
  { id: 'notifications', label: 'Notificaciones' },
];

export type NotificationsWorkspaceLink = {
  id: 'notifications' | 'notifications-all' | 'notifications-unread';
  label: string;
  href: string;
  description: string;
};

export const notificationsWorkspaceLinks: NotificationsWorkspaceLink[] = [
  {
    id: 'notifications',
    label: 'Notificaciones',
    href: '/dashboard/notifications',
    description: 'Consulta las notificaciones de las últimas 24 horas.',
  },
  {
    id: 'notifications-all',
    label: 'Todas',
    href: '/dashboard/notifications/all',
    description: 'Consulta todo el historial de notificaciones.',
  },
  {
    id: 'notifications-unread',
    label: 'Sin leer',
    href: '/dashboard/notifications/unread',
    description: 'Consulta únicamente las notificaciones sin leer.',
  },
];

export const adminWorkspaceLinks: AdminWorkspaceLink[] = [
  {
    id: 'provisioning-runs',
    label: 'Empresas registradas',
    href: '/dashboard/admin/provisioning-runs',
    description:
      'Revisa el estado de los procesos de alta y sus pasos registrados.',
  },
  {
    id: 'application-errors',
    label: 'Errores de aplicación',
    href: '/dashboard/admin/application-errors',
    description:
      'Investiga fallos técnicos asociados a identificadores de correlación.',
  },
  {
    id: 'audit-events',
    label: 'Eventos de auditoría',
    href: '/dashboard/admin/audit-events',
    description:
      'Consulta la trazabilidad estructurada de la actividad de la plataforma.',
  },
];

export const canViewAdminSignals = (session: AuthSession) =>
  session.memberships.some(
    (membership) => membership.role === 'platform-admin',
  );

export const getActiveMembership = (
  session: AuthSession,
): AuthMembership | null => {
  if (session.activeCompany) {
    return (
      session.memberships.find(
        (membership) =>
          membership.companyId === session.activeCompany?.companyId,
      ) ?? null
    );
  }

  return (
    session.memberships.find(
      (membership) => membership.role === 'platform-admin',
    ) ?? null
  );
};

export const getDashboardStatusLabel = (status: CompanyLifecycle) => {
  switch (status) {
    case 'active':
      return 'Activa';
    case 'suspended':
      return 'Suspendida';
    case 'provisioning_failed':
      return 'Pendiente de soporte';
  }
};

export const getDashboardCompanyLabel = (
  session: AuthSession,
  company?: DashboardCurrentCompanySummary | null,
) => {
  const activeMembership = getActiveMembership(session);

  if (session.activeCompany) {
    return company?.name ?? 'Empresa activa';
  }

  if (canViewAdminSignals(session)) {
    return dashboardRoleLabels['platform-admin'];
  }

  if (getCompanyMemberships(session).length > 0) {
    return 'Selecciona una empresa';
  }

  if (!activeMembership) {
    return 'Sin empresa vinculada';
  }

  return dashboardRoleLabels[activeMembership.role];
};

export const getDashboardCompanyDetail = (
  session: AuthSession,
  company?: DashboardCurrentCompanySummary | null,
) => {
  const activeMembership = getActiveMembership(session);

  if (session.activeCompany) {
    return activeMembership
      ? `${dashboardRoleLabels[activeMembership.role]} · ${getDashboardStatusLabel(session.activeCompany.status)}`
      : (company?.name ?? session.user.email);
  }

  if (canViewAdminSignals(session)) {
    return dashboardRoleLabels['platform-admin'];
  }

  if (getCompanyMemberships(session).length > 0) {
    return 'Elige una empresa para continuar';
  }

  if (!activeMembership) {
    return session.user.email;
  }

  return dashboardRoleLabels[activeMembership.role];
};

export const getDashboardCurrentSection = (pathname: string) => {
  if (pathname.startsWith('/dashboard/company-status')) {
    return 'Estado de empresa';
  }

  if (pathname.startsWith('/dashboard/notifications')) {
    return 'Notificaciones';
  }

  if (pathname.startsWith('/dashboard/settings')) {
    return 'Configuracion';
  }

  if (pathname.startsWith('/dashboard/admin')) {
    return 'Administracion';
  }

  return 'Inicio';
};

export const getVisibleDashboardModules = (session: AuthSession) => {
  if (canViewAdminSignals(session)) {
    return [...baseModules, ...platformAdminModules];
  }

  if (!session.activeCompany) {
    return [];
  }

  return baseModules;
};

export const createBlockedCompanyViewModel = (
  status: BlockedCompanyViewModel['status'],
): BlockedCompanyViewModel => ({
  status,
  title: 'Estado de tu empresa',
  body: 'No podemos mostrar la información de esta empresa en este momento. Contacta a soporte para continuar.',
  supportHref: 'mailto:soporte@vimcore.app',
});
