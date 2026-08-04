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
  return async (divisionId: string): Promise<void> => {
    const localCount = await gateway.countLocalsInDivision(divisionId);

    if (localCount > 0) {
      throw new DivisionConflictError();
    }

    try {
      await gateway.deleteDivision(divisionId);
    } catch (error) {
      if (error instanceof DivisionNotFoundError) {
        throw error;
      }
      throw error;
    }
  };
};