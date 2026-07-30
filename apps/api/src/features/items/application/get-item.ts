import type { Item, ItemCatalogGateway } from '../domain/item';

type GetItemInput = {
  companyId: string;
  itemId: string;
  includeDeleted?: boolean;
};

export const createGetItemUseCase = ({
  itemGateway,
}: {
  itemGateway: ItemCatalogGateway;
}) => {
  return async (input: GetItemInput): Promise<Item | null> => {
    return await itemGateway.getItemById({
      companyId: input.companyId,
      itemId: input.itemId,
      includeDeleted: input.includeDeleted ?? false,
    });
  };
};
