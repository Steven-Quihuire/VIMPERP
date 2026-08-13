import type { OrgHierarchyGateway, Warehouse } from '../domain/org-hierarchy';

export const createListWarehousesUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (companyId: string): Promise<Warehouse[]> =>
    gateway.listWarehouses(companyId);
};
