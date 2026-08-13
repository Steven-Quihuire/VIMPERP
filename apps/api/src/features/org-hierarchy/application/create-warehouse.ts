import {
  InvalidHierarchyParentError,
  ParentOwnershipError,
  WarehouseNameConflictError,
  type OrgHierarchyGateway,
  type Warehouse,
  type WarehouseParent,
} from '../domain/org-hierarchy';

export const createCreateWarehouseUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (input: {
    companyId: string;
    name: string;
    actorUserId: string;
    correlationId: string;
  } & WarehouseParent): Promise<Warehouse> => {
    const name = input.name.trim();

    if (name.length === 0) {
      throw new WarehouseNameConflictError('Warehouse name is required.');
    }

    const parentCount = Number('areaId' in input) + Number('localId' in input);

    if (parentCount !== 1) {
      throw new InvalidHierarchyParentError(
        'Warehouse must belong to exactly one parent: area or local.',
      );
    }

    if ('areaId' in input) {
      const area = await gateway.findAreaById(input.areaId);

      if (!area || area.companyId !== input.companyId) {
        throw new ParentOwnershipError('Area does not belong to the target company.');
      }
    }

    if ('localId' in input) {
      const local = await gateway.findLocalById(input.localId);

      if (!local || local.companyId !== input.companyId) {
        throw new ParentOwnershipError('Local does not belong to the target company.');
      }
    }

    return gateway.createWarehouse({ ...input, name });
  };
};
