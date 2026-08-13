import {
  WarehouseNotFoundError,
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
