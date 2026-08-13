import {
  DivisionConflictError,
  DivisionNotFoundError,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

export const createDeleteDivisionUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (input: {
    divisionId: string;
    actorUserId: string;
    correlationId: string;
  }): Promise<void> => {
    const [localCount, areaCount] = await Promise.all([
      gateway.countLocalsInDivision(input.divisionId),
      gateway.countAreasInDivision(input.divisionId),
    ]);

    if (localCount > 0 || areaCount > 0) {
      throw new DivisionConflictError();
    }

    try {
      await gateway.deleteDivision(input);
    } catch (error) {
      if (error instanceof DivisionNotFoundError) {
        throw error;
      }
      throw error;
    }
  };
};
