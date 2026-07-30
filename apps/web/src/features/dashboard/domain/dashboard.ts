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
  { id: 'platform-overview', label: 'Platform overview' },
  { id: 'notifications', label: 'Notifications' },
];

export const adminWorkspaceLinks: AdminWorkspaceLink[] = [
  {
    id: 'provisioning-runs',
    label: 'Provisioning runs',
    href: '/dashboard/admin/provisioning-runs',
    description: 'Inspect onboarding run status, attempts, and recorded steps.',
  },
  {
    id: 'application-errors',
    label: 'Application errors',
    href: '/dashboard/admin/application-errors',
    description: 'Inspect sanitized technical failures linked to correlation identifiers.',
  },
  {
    id: 'audit-events',
    label: 'Audit events',
    href: '/dashboard/admin/audit-events',
    description: 'Inspect structured audit history for platform activity.',
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
