import type { Division, OrgHierarchyGateway } from '../domain/org-hierarchy';

export const createListDivisionsUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (companyId: string): Promise<Division[]> =>
    gateway.listDivisions(companyId);
};