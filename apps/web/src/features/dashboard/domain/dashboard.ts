import type { AuthSession } from '../../auth/domain/auth';

export type DashboardModule = {
  id: string;
  label: string;
};

const dashboardRoleLabels: Record<AuthSession['memberships'][number]['role'], string> = {
  'platform-admin': 'Administrador de plataforma',
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

export type DashboardNotification = {
  id: string;
  companyId: string;
  targetRole: string;
  type: string;
  message: string;
  createdAt: string;
};

export type AdminWorkspaceLink = {
  id:
    | 'companies'
    | 'provisioning-runs'
    | 'application-errors'
    | 'audit-events';
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

export const adminWorkspaceLinks: AdminWorkspaceLink[] = [
  {
    id: 'companies',
    label: 'Empresas',
    href: '/dashboard/admin/companies',
    description: 'Consulta la información completa de las empresas registradas.',
  },
  {
    id: 'provisioning-runs',
    label: 'Procesos de alta',
    href: '/dashboard/admin/provisioning-runs',
    description: 'Revisa el estado de los procesos de alta y sus pasos registrados.',
  },
  {
    id: 'application-errors',
    label: 'Errores de aplicación',
    href: '/dashboard/admin/application-errors',
    description: 'Investiga fallos técnicos asociados a identificadores de correlación.',
  },
  {
    id: 'audit-events',
    label: 'Eventos de auditoría',
    href: '/dashboard/admin/audit-events',
    description: 'Consulta la trazabilidad estructurada de la actividad de la plataforma.',
  },
];

export const canViewAdminSignals = (session: AuthSession) =>
  session.memberships.some((membership) => membership.role === 'platform-admin');

export const getPrimaryMembership = (session: AuthSession) => session.memberships[0] ?? null;

export const getDashboardCompanyLabel = (
  session: AuthSession,
  company?: DashboardCurrentCompanySummary | null,
) => {
  const primaryMembership = getPrimaryMembership(session);

  if (!primaryMembership) {
    return 'Sin empresa vinculada';
  }

  if (primaryMembership.companyId) {
    return company?.name ?? 'Empresa vinculada';
  }

  return dashboardRoleLabels[primaryMembership.role];
};

export const getDashboardCompanyDetail = (
  session: AuthSession,
  company?: DashboardCurrentCompanySummary | null,
) => {
  const primaryMembership = getPrimaryMembership(session);

  if (!primaryMembership) {
    return session.user.email;
  }

  if (primaryMembership.companyId) {
    return company?.name ? dashboardRoleLabels[primaryMembership.role] : session.user.email;
  }

  return 'Sin empresa vinculada en esta sesion';
};

export const getDashboardCurrentSection = (pathname: string) => {
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

  return baseModules;
};
