import {
  PointOfSaleNotFoundError,
  PointOfSaleConflictError,
  hasScopeNodeDependencies,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

export const createDeletePointOfSaleUseCase = ({
  gateway,
}: {
  gateway: OrgHierarchyGateway;
}) => {
  return async (input: {
    pointOfSaleId: string;
    actorUserId: string;
    correlationId: string;
  }): Promise<void> => {
    const dependencies = await gateway.getScopeNodeDependencyCounts({
      nodeType: 'point-of-sale',
      sourceId: input.pointOfSaleId,
    });

    if (hasScopeNodeDependencies(dependencies)) {
      throw new PointOfSaleConflictError();
    }

    try {
      await gateway.deletePointOfSale(input);
    } catch (error) {
      if (error instanceof PointOfSaleNotFoundError) {
        throw error;
      }

      throw error;
    }
  };
};
