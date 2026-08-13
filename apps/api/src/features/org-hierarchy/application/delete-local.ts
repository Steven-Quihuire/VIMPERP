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
  return async (input: {
    localId: string;
    actorUserId: string;
    correlationId: string;
  }): Promise<void> => {
    const [itemCount, membershipCount, areaCount, warehouseCount, pointOfSaleCount] = await Promise.all([
      gateway.countItemsInLocal(input.localId),
      gateway.countMembershipsInLocal(input.localId),
      gateway.countAreasInLocal(input.localId),
      gateway.countWarehousesInLocal(input.localId),
      gateway.countPointsOfSaleInLocal(input.localId),
    ]);

    if (
      itemCount > 0 ||
      membershipCount > 0 ||
      areaCount > 0 ||
      warehouseCount > 0 ||
      pointOfSaleCount > 0
    ) {
      throw new LocalConflictError();
    }

    try {
      await gateway.deleteLocal(input);
    } catch (error) {
      if (error instanceof LocalNotFoundError) {
        throw error;
      }
      throw error;
    }
  };
};
