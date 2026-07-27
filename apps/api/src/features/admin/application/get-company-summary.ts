import type { AdminGateway } from '../domain/admin';

export const createGetCompanySummary = (adminGateway: AdminGateway) => {
  return async () => await adminGateway.getCompanySummary();
};
