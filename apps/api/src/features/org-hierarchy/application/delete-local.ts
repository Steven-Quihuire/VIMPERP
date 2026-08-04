import {
  LocalConflictError,
  LocalNotFoundError,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

export const createDeleteLocalUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (localId: string): Promise<void> => {
    const [itemCount, membershipCount] = await Promise.all([
      gateway.countItemsInLocal(localId),
      gateway.countMembershipsInLocal(localId),
    ]);

    if (itemCount > 0 || membershipCount > 0) {
      throw new LocalConflictError();
    }

    try {
      await gateway.deleteLocal(localId);
    } catch (error) {
      if (error instanceof LocalNotFoundError) {
        throw error;
      }
      throw error;
    }
  };
};