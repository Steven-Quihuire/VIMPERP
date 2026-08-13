import {
  WarehouseNotFoundError,
  WarehouseConflictError,
  hasScopeNodeDependencies,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

export const createDeleteWarehouseUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (input: {
    warehouseId: string;
    actorUserId: string;
    correlationId: string;
  }): Promise<void> => {
    const dependencies = await gateway.getScopeNodeDependencyCounts({
      nodeType: 'warehouse',
      sourceId: input.warehouseId,
    });

    if (hasScopeNodeDependencies(dependencies)) {
      throw new WarehouseConflictError();
    }

    try {
      await gateway.deleteWarehouse(input);
    } catch (error) {
      if (error instanceof WarehouseNotFoundError) {
        throw error;
      }

      throw error;
    }
  };
};
