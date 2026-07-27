import type { AuthRole } from '../../identity/domain/auth';

export type AdminCompanySignal = {
  id: string;
  name: string;
  createdAt: string;
};

export type AdminCompanySummary = {
  totalCompanies: number;
  notificationCount: number;
  auditEventCount: number;
  companies: AdminCompanySignal[];
};

export type AdminNotification = {
  id: string;
  companyId: string;
  targetRole: AuthRole;
  type: string;
  message: string;
  createdAt: string;
};

export type AdminGateway = {
  getCompanySummary: () => Promise<AdminCompanySummary>;
  listNotifications: () => Promise<AdminNotification[]>;
};
