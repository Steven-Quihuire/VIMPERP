import {
  AreaNameConflictError,
  AreaNotFoundError,
  InvalidHierarchyParentError,
  ParentOwnershipError,
  type Area,
  type AreaParentUpdate,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

export const createUpdateAreaUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  const hasDivisionParent = (
    input: ({ areaId: string; name: string; actorUserId: string; correlationId: string } | (({ areaId: string; name?: string | undefined } & AreaParentUpdate) & { actorUserId: string; correlationId: string })),
  ): input is { areaId: string; name?: string | undefined; divisionId: string; localId?: never; actorUserId: string; correlationId: string } =>
    'divisionId' in input;

  const hasLocalParent = (
    input: ({ areaId: string; name: string; actorUserId: string; correlationId: string } | (({ areaId: string; name?: string | undefined } & AreaParentUpdate) & { actorUserId: string; correlationId: string })),
  ): input is { areaId: string; name?: string | undefined; divisionId?: never; localId: string; actorUserId: string; correlationId: string } =>
    'localId' in input;

  return async (input:
    | { areaId: string; name: string; actorUserId: string; correlationId: string }
    | (({ areaId: string; name?: string | undefined } & AreaParentUpdate) & { actorUserId: string; correlationId: string })): Promise<Area> => {
    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new AreaNameConflictError('Area name is required.');
    }

    if (hasDivisionParent(input) || hasLocalParent(input)) {
      const parentCount = Number(hasDivisionParent(input)) + Number(hasLocalParent(input));

      if (parentCount !== 1) {
        throw new InvalidHierarchyParentError(
          'Area must belong to exactly one parent: division or local.',
        );
      }

      const current = await gateway.findAreaById(input.areaId);

      if (!current) {
        throw new AreaNotFoundError();
      }

      if (hasDivisionParent(input)) {
        const division = await gateway.findDivisionById(input.divisionId);

        if (!division || division.companyId !== current.companyId) {
          throw new ParentOwnershipError('Division does not belong to the same company as the area.');
        }
      }

      if (hasLocalParent(input)) {
        const local = await gateway.findLocalById(input.localId);

        if (!local || local.companyId !== current.companyId) {
          throw new ParentOwnershipError('Local does not belong to the same company as the area.');
        }
      }
    }

    const auditContext = {
      areaId: input.areaId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
    };
    const namePatch =
      input.name !== undefined ? { name: input.name.trim() } : {};

    try {
      if (hasDivisionParent(input)) {
        return await gateway.updateArea({
          ...auditContext,
          ...namePatch,
          divisionId: input.divisionId,
        });
      }

      if (hasLocalParent(input)) {
        return await gateway.updateArea({
          ...auditContext,
          ...namePatch,
          localId: input.localId,
        });
      }

      return await gateway.updateArea({
        ...auditContext,
        name: input.name.trim(),
      });
    } catch (error) {
      if (error instanceof AreaNotFoundError) {
        throw error;
      }

      throw error;
    }
  };
};
