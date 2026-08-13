import {
  LocalConflictError,
  LocalNotFoundError,
  hasScopeNodeDependencies,
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
    const [
      itemCount,
      membershipCount,
      areaCount,
      warehouseCount,
      pointOfSaleCount,
      scopeNodeDependencies,
    ] = await Promise.all([
      gateway.countItemsInLocal(input.localId),
      gateway.countMembershipsInLocal(input.localId),
      gateway.countAreasInLocal(input.localId),
      gateway.countWarehousesInLocal(input.localId),
      gateway.countPointsOfSaleInLocal(input.localId),
      gateway.getScopeNodeDependencyCounts({
        nodeType: 'local',
        sourceId: input.localId,
      }),
    ]);

    if (
      itemCount > 0 ||
      membershipCount > 0 ||
      areaCount > 0 ||
      warehouseCount > 0 ||
      pointOfSaleCount > 0 ||
      hasScopeNodeDependencies(scopeNodeDependencies)
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
