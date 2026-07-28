import type { AdminGateway } from '../domain/admin';

export const createGetApplicationErrorDetail = (adminGateway: AdminGateway) => {
  return async (errorId: string) => await adminGateway.getApplicationError(errorId);
};
