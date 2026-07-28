import type { AdminGateway, AdminProvisioningRunListFilters } from '../domain/admin';

export const createListProvisioningRuns = (adminGateway: AdminGateway) => {
  return async (filters: AdminProvisioningRunListFilters) =>
    await adminGateway.listProvisioningRuns(filters);
};
