import type { Item, ItemCatalogGateway } from '../domain/item';

type ListItemsInput = {
  companyId: string;
  limit: number;
  cursor?: string;
};

export const createListItemsUseCase = ({
  itemGateway,
}: {
  itemGateway: ItemCatalogGateway;
}) => {
  return async (input: ListItemsInput): Promise<{ items: Item[]; nextCursor: string | null }> => {
    return await itemGateway.listItems({
      companyId: input.companyId,
      limit: input.limit,
      ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
    });
  };
};
