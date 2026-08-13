import {
  LocalNameConflictError,
  ParentOwnershipError,
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
    actorUserId: string;
    correlationId: string;
  }): Promise<Local> => {
    const name = input.name.trim();

    if (name.length === 0) {
      throw new LocalNameConflictError('Local name is required.');
    }

    if (input.divisionId) {
      const division = await gateway.findDivisionById(input.divisionId);

      if (!division || division.companyId !== input.companyId) {
        throw new ParentOwnershipError('Division does not belong to the target company.');
      }
    }

    return gateway.createLocal({
      companyId: input.companyId,
      name,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      ...(input.divisionId !== undefined ? { divisionId: input.divisionId } : {}),
    });
  };
};
