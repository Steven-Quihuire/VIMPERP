import {
  InvalidHierarchyParentError,
  ParentOwnershipError,
  WarehouseNameConflictError,
  WarehouseNotFoundError,
  type OrgHierarchyGateway,
  type Warehouse,
  type WarehouseParentUpdate,
} from '../domain/org-hierarchy';

export const createUpdateWarehouseUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  const hasAreaParent = (
    input:
      | { warehouseId: string; name: string; actorUserId: string; correlationId: string }
      | (({ warehouseId: string; name?: string | undefined } & WarehouseParentUpdate) & { actorUserId: string; correlationId: string }),
  ): input is { warehouseId: string; name?: string | undefined; areaId: string; localId?: never; actorUserId: string; correlationId: string } =>
    'areaId' in input;

  const hasLocalParent = (
    input:
      | { warehouseId: string; name: string; actorUserId: string; correlationId: string }
      | (({ warehouseId: string; name?: string | undefined } & WarehouseParentUpdate) & { actorUserId: string; correlationId: string }),
  ): input is { warehouseId: string; name?: string | undefined; areaId?: never; localId: string; actorUserId: string; correlationId: string } =>
    'localId' in input;

  return async (input:
    | { warehouseId: string; name: string; actorUserId: string; correlationId: string }
    | (({ warehouseId: string; name?: string | undefined } & WarehouseParentUpdate) & { actorUserId: string; correlationId: string })): Promise<Warehouse> => {
    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new WarehouseNameConflictError('Warehouse name is required.');
    }

    if (hasAreaParent(input) || hasLocalParent(input)) {
      const parentCount = Number(hasAreaParent(input)) + Number(hasLocalParent(input));

      if (parentCount !== 1) {
        throw new InvalidHierarchyParentError(
          'Warehouse must belong to exactly one parent: area or local.',
        );
      }

      const current = await gateway.findWarehouseById(input.warehouseId);

      if (!current) {
        throw new WarehouseNotFoundError();
      }

      if (hasAreaParent(input)) {
        const area = await gateway.findAreaById(input.areaId);

        if (!area || area.companyId !== current.companyId) {
          throw new ParentOwnershipError('Area does not belong to the same company as the warehouse.');
        }
      }

      if (hasLocalParent(input)) {
        const local = await gateway.findLocalById(input.localId);

        if (!local || local.companyId !== current.companyId) {
          throw new ParentOwnershipError('Local does not belong to the same company as the warehouse.');
        }
      }
    }

    try {
      return await gateway.updateWarehouse({
        warehouseId: input.warehouseId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(hasAreaParent(input) ? { areaId: input.areaId } : {}),
        ...(hasLocalParent(input) ? { localId: input.localId } : {}),
      });
    } catch (error) {
      if (error instanceof WarehouseNotFoundError) {
        throw error;
      }

      throw error;
    }
  };
};
