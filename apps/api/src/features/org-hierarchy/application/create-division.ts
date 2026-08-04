import {
  DivisionNameConflictError,
  type Division,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

export const createCreateDivisionUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (input: { companyId: string; name: string }):
    Promise<Division> => {
    const name = input.name.trim();

    if (name.length === 0) {
      throw new DivisionNameConflictError('Division name is required.');
    }

    return gateway.createDivision({ companyId: input.companyId, name });
  };
};