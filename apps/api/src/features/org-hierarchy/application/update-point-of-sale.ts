import {
  InvalidHierarchyParentError,
  ParentOwnershipError,
  PointOfSaleNameConflictError,
  PointOfSaleNotFoundError,
  type OrgHierarchyGateway,
  type PointOfSale,
  type WarehouseParentUpdate,
} from '../domain/org-hierarchy';

export const createUpdatePointOfSaleUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  const hasAreaParent = (
    input:
      | { pointOfSaleId: string; name: string; actorUserId: string; correlationId: string }
      | (({ pointOfSaleId: string; name?: string | undefined } & WarehouseParentUpdate) & { actorUserId: string; correlationId: string }),
  ): input is { pointOfSaleId: string; name?: string | undefined; areaId: string; localId?: never; actorUserId: string; correlationId: string } =>
    'areaId' in input;

  const hasLocalParent = (
    input:
      | { pointOfSaleId: string; name: string; actorUserId: string; correlationId: string }
      | (({ pointOfSaleId: string; name?: string | undefined } & WarehouseParentUpdate) & { actorUserId: string; correlationId: string }),
  ): input is { pointOfSaleId: string; name?: string | undefined; areaId?: never; localId: string; actorUserId: string; correlationId: string } =>
    'localId' in input;

  return async (input:
    | { pointOfSaleId: string; name: string; actorUserId: string; correlationId: string }
    | (({ pointOfSaleId: string; name?: string | undefined } & WarehouseParentUpdate) & { actorUserId: string; correlationId: string })): Promise<PointOfSale> => {
    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new PointOfSaleNameConflictError('Point of sale name is required.');
    }

    if (hasAreaParent(input) || hasLocalParent(input)) {
      const parentCount = Number(hasAreaParent(input)) + Number(hasLocalParent(input));

      if (parentCount !== 1) {
        throw new InvalidHierarchyParentError(
          'Point of sale must belong to exactly one parent: area or local.',
        );
      }

      const current = await gateway.findPointOfSaleById(input.pointOfSaleId);

      if (!current) {
        throw new PointOfSaleNotFoundError();
      }

      if (hasAreaParent(input)) {
        const area = await gateway.findAreaById(input.areaId);

        if (!area || area.companyId !== current.companyId) {
          throw new ParentOwnershipError('Area does not belong to the same company as the point of sale.');
        }
      }

      if (hasLocalParent(input)) {
        const local = await gateway.findLocalById(input.localId);

        if (!local || local.companyId !== current.companyId) {
          throw new ParentOwnershipError('Local does not belong to the same company as the point of sale.');
        }
      }
    }

    try {
      return await gateway.updatePointOfSale({
        pointOfSaleId: input.pointOfSaleId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(hasAreaParent(input) ? { areaId: input.areaId } : {}),
        ...(hasLocalParent(input) ? { localId: input.localId } : {}),
      });
    } catch (error) {
      if (error instanceof PointOfSaleNotFoundError) {
        throw error;
      }

      throw error;
    }
  };
};
