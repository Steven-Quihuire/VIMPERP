import type { AdminGateway } from '../domain/admin';

export const createGetProvisioningRunDetail = (adminGateway: AdminGateway) => {
  return async (runId: string) => await adminGateway.getProvisioningRun(runId);
};
