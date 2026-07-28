import type { AdminGateway } from '../domain/admin';

export const createGetAuditEventDetail = (adminGateway: AdminGateway) => {
  return async (eventId: string) => await adminGateway.getAuditEvent(eventId);
};
