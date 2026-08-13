import {
  LocalNameConflictError,
  LocalNotFoundError,
  ParentOwnershipError,
  type Local,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

export const createUpdateLocalUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (input: {
    localId: string;
    name?: string;
    divisionId?: string | null;
    actorUserId: string;
    correlationId: string;
  }): Promise<Local> => {
    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new LocalNameConflictError('Local name is required.');
    }

    if (input.divisionId !== undefined && input.divisionId !== null) {
      const [current, division] = await Promise.all([
        gateway.findLocalById(input.localId),
        gateway.findDivisionById(input.divisionId),
      ]);

      if (!current) {
        throw new LocalNotFoundError();
      }

      if (!division || division.companyId !== current.companyId) {
        throw new ParentOwnershipError('Division does not belong to the same company as the local.');
      }
    }

    try {
      return await gateway.updateLocal({
        localId: input.localId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.divisionId !== undefined ? { divisionId: input.divisionId } : {}),
      });
    } catch (error) {
      if (error instanceof LocalNotFoundError) {
        throw error;
      }
      throw error;
    }
  };
};
