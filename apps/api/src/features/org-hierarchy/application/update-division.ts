import {
  DivisionNameConflictError,
  DivisionNotFoundError,
  type Division,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

export const createUpdateDivisionUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (input: {
    divisionId: string;
    name: string;
    actorUserId: string;
    correlationId: string;
  }):
    Promise<Division> => {
    const name = input.name.trim();

    if (name.length === 0) {
      throw new DivisionNameConflictError('Division name is required.');
    }

    try {
      return await gateway.updateDivision({
        divisionId: input.divisionId,
        name,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
      });
    } catch (error) {
      if (error instanceof DivisionNotFoundError) {
        throw error;
      }
      throw error;
    }
  };
};
