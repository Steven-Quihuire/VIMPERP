import { ForbiddenError } from '../../identity/domain/auth';
import { ItemNotFoundError, type ItemCatalogGateway } from '../domain/item';

type SoftDeleteItemInput = {
  companyId: string;
  actorUserId: string;
  correlationId: string;
  itemId: string;
  role: string;
};

export const createSoftDeleteItemUseCase = ({
  itemGateway,
}: {
  itemGateway: ItemCatalogGateway;
}) => {
  return async (input: SoftDeleteItemInput): Promise<void> => {
    if (input.role !== 'company-owner') {
      throw new ForbiddenError();
    }

    const existingItem = await itemGateway.getItemById({
      companyId: input.companyId,
      itemId: input.itemId,
      includeDeleted: false,
    });

    if (!existingItem) {
      throw new ItemNotFoundError();
    }

    await itemGateway.softDeleteItem({
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      itemId: input.itemId,
    });
  };
};
