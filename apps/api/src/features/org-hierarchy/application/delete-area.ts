import {
  AreaConflictError,
  AreaNotFoundError,
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
    const [warehouseCount, pointOfSaleCount, employeeCount] = await Promise.all([
      gateway.countWarehousesInArea(input.areaId),
      gateway.countPointsOfSaleInArea(input.areaId),
      gateway.countEmployeesInArea(input.areaId),
    ]);

    if (warehouseCount > 0 || pointOfSaleCount > 0 || employeeCount > 0) {
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
