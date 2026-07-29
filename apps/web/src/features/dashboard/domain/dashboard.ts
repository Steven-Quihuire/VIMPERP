import type { AuthSession } from '../../auth/domain/auth';

export type DashboardModule = {
  id: string;
  label: string;
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

export const getVisibleDashboardModules = (session: AuthSession) => {
  if (canViewAdminSignals(session)) {
    return [...baseModules, ...platformAdminModules];
  }

  return baseModules;
};
