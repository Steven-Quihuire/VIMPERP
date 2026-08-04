import {
  LocalNameConflictError,
  type Local,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

export const createCreateLocalUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (input: {
    companyId: string;
    name: string;
    divisionId?: string | null;
  }): Promise<Local> => {
    const name = input.name.trim();

    if (name.length === 0) {
      throw new LocalNameConflictError('Local name is required.');
    }

    return gateway.createLocal({
      companyId: input.companyId,
      name,
      ...(input.divisionId !== undefined ? { divisionId: input.divisionId } : {}),
    });
  };
};