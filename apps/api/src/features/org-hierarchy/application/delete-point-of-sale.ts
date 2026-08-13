import {
  PointOfSaleNotFoundError,
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
