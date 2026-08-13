import type { AdminGateway } from '../domain/admin';

export const createListCompanyNotifications = (adminGateway: AdminGateway) => {
  return async (input: { companyId: string; targetRole: 'company-owner' | 'company-user' }) =>
    await adminGateway.listNotificationsForCompanyRole(input);
};
