import {
  AreaConflictError,
  AreaNotFoundError,
  hasScopeNodeDependencies,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

export const createDeleteAreaUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (input: {
    areaId: string;
    actorUserId: string;
    correlationId: string;
  }): Promise<void> => {
    const [
      warehouseCount,
      pointOfSaleCount,
      employeeCount,
      scopeNodeDependencies,
    ] = await Promise.all([
      gateway.countWarehousesInArea(input.areaId),
      gateway.countPointsOfSaleInArea(input.areaId),
      gateway.countEmployeesInArea(input.areaId),
      gateway.getScopeNodeDependencyCounts({
        nodeType: 'area',
        sourceId: input.areaId,
      }),
    ]);

    if (
      warehouseCount > 0 ||
      pointOfSaleCount > 0 ||
      employeeCount > 0 ||
      hasScopeNodeDependencies(scopeNodeDependencies)
    ) {
      throw new AreaConflictError();
    }

    try {
      await gateway.deleteArea(input);
    } catch (error) {
      if (error instanceof AreaNotFoundError) {
        throw error;
      }

      throw error;
    }
  };
};
