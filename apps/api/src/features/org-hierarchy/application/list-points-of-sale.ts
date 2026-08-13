import type { OrgHierarchyGateway, PointOfSale } from '../domain/org-hierarchy';

export const createListPointsOfSaleUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (companyId: string): Promise<PointOfSale[]> =>
    gateway.listPointsOfSale(companyId);
};
