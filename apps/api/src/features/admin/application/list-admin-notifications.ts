import type { AdminGateway } from '../domain/admin';

export const createListAdminNotifications = (adminGateway: AdminGateway) => {
  return async () => await adminGateway.listNotifications();
};
