import type { AdminAuditEventListFilters, AdminGateway } from '../domain/admin';

export const createListAuditEvents = (adminGateway: AdminGateway) => {
  return async (filters: AdminAuditEventListFilters) =>
    await adminGateway.listAuditEvents(filters);
};
