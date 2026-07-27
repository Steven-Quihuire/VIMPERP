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

const baseModules: DashboardModule[] = [
  { id: 'crm', label: 'CRM' },
  { id: 'sales', label: 'Sales' },
  { id: 'inventory', label: 'Inventory' },
];

const platformAdminModules: DashboardModule[] = [
  { id: 'platform-overview', label: 'Platform overview' },
  { id: 'notifications', label: 'Notifications' },
];

export const canViewAdminSignals = (session: AuthSession) =>
  session.memberships.some((membership) => membership.role === 'platform-admin');

export const getVisibleDashboardModules = (session: AuthSession) => {
  if (canViewAdminSignals(session)) {
    return [...baseModules, ...platformAdminModules];
  }

  return baseModules;
};
