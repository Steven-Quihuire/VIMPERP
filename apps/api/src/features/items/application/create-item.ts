import type {
  ItemCatalogGateway,
  ItemTrackBatchMode,
  ItemType,
  ItemUnit,
} from '../domain/item';

type CreateItemInput = {
  companyId: string;
  actorUserId: string;
  correlationId: string;
  name: string;
  type: ItemType;
  unit: ItemUnit;
  sku: string | null;
  categoryId: string | null;
  unitPrice: number;
  tracksStock?: boolean;
  trackBatchMode?: ItemTrackBatchMode;
};

export const createCreateItemUseCase = ({
  itemGateway,
}: {
  itemGateway: ItemCatalogGateway;
}) => {
  return async (input: CreateItemInput): Promise<{ itemId: string }> => {
    const name = input.name.trim();

    if (name.length === 0) {
      throw new Error('Item name is required');
    }

    if (input.unitPrice < 0) {
      throw new Error('Item unit price must be non-negative');
    }

    return await itemGateway.createItem({
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      name,
      type: input.type,
      unit: input.unit,
      sku: input.sku,
      categoryId: input.categoryId,
      unitPrice: input.unitPrice,
      tracksStock: input.type === 'service' ? false : (input.tracksStock ?? false),
      trackBatchMode: input.trackBatchMode ?? 'none',
    });
  };
};
