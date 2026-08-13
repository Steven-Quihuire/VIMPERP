import type { Area, OrgHierarchyGateway } from '../domain/org-hierarchy';

export const createListAreasUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (companyId: string): Promise<Area[]> => gateway.listAreas(companyId);
};
