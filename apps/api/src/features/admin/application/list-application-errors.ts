import type { AdminApplicationErrorListFilters, AdminGateway } from '../domain/admin';

export const createListApplicationErrors = (adminGateway: AdminGateway) => {
  return async (filters: AdminApplicationErrorListFilters) =>
    await adminGateway.listApplicationErrors(filters);
};
