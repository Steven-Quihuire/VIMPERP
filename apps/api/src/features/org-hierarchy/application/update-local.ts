import {
  LocalNameConflictError,
  LocalNotFoundError,
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
  }): Promise<Local> => {
    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new LocalNameConflictError('Local name is required.');
    }

    try {
      return await gateway.updateLocal({
        localId: input.localId,
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