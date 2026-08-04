import type { Local, OrgHierarchyGateway } from '../domain/org-hierarchy';

export const createListLocalsUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (companyId: string): Promise<Local[]> =>
    gateway.listLocals(companyId);
};