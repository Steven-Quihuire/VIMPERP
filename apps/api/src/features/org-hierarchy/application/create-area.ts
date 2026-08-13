import {
  AreaNameConflictError,
  InvalidHierarchyParentError,
  ParentOwnershipError,
  type Area,
  type AreaParent,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

export const createCreateAreaUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (input: {
    companyId: string;
    name: string;
    actorUserId: string;
    correlationId: string;
  } & AreaParent): Promise<Area> => {
    const name = input.name.trim();

    if (name.length === 0) {
      throw new AreaNameConflictError('Area name is required.');
    }

    const parentCount = Number('divisionId' in input) + Number('localId' in input);

    if (parentCount !== 1) {
      throw new InvalidHierarchyParentError(
        'Area must belong to exactly one parent: division or local.',
      );
    }

    if ('divisionId' in input) {
      const division = await gateway.findDivisionById(input.divisionId);

      if (!division || division.companyId !== input.companyId) {
        throw new ParentOwnershipError('Division does not belong to the target company.');
      }
    }

    if ('localId' in input) {
      const local = await gateway.findLocalById(input.localId);

      if (!local || local.companyId !== input.companyId) {
        throw new ParentOwnershipError('Local does not belong to the target company.');
      }
    }

    return gateway.createArea({ ...input, name });
  };
};
