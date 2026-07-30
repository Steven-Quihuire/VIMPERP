import {
  ItemNotFoundError,
  ItemTypeImmutableError,
  type ItemCatalogGateway,
  type ItemTrackBatchMode,
  type ItemType,
  type ItemUnit,
} from '../domain/item';

type UpdateItemInput = {
  companyId: string;
  actorUserId: string;
  correlationId: string;
  itemId: string;
  type?: ItemType;
  name?: string;
  unit?: ItemUnit;
  sku?: string | null;
  categoryId?: string | null;
  unitPrice?: number;
  tracksStock?: boolean;
  trackBatchMode?: ItemTrackBatchMode;
};

export const createUpdateItemUseCase = ({
  itemGateway,
}: {
  itemGateway: ItemCatalogGateway;
}) => {
  return async (input: UpdateItemInput): Promise<{ itemId: string }> => {
    const existingItem = await itemGateway.getItemById({
      companyId: input.companyId,
      itemId: input.itemId,
      includeDeleted: false,
    });

    if (!existingItem) {
      throw new ItemNotFoundError();
    }

    if (input.type !== undefined && input.type !== existingItem.type) {
      throw new ItemTypeImmutableError();
    }

    if (input.unitPrice !== undefined && input.unitPrice < 0) {
      throw new Error('Item unit price must be non-negative');
    }

    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new Error('Item name is required');
    }

    const patch: {
      companyId: string;
      actorUserId: string;
      correlationId: string;
      itemId: string;
      name?: string;
      unit?: ItemUnit;
      sku?: string | null;
      categoryId?: string | null;
      unitPrice?: number;
      tracksStock?: boolean;
      trackBatchMode?: ItemTrackBatchMode;
    } = {
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      itemId: input.itemId,
    };

    if (input.name !== undefined) {
      patch.name = input.name.trim();
    }

    if (input.unit !== undefined) {
      patch.unit = input.unit;
    }

    if (input.sku !== undefined) {
      patch.sku = input.sku;
    }

    if (input.categoryId !== undefined) {
      patch.categoryId = input.categoryId;
    }

    if (input.unitPrice !== undefined) {
      patch.unitPrice = input.unitPrice;
    }

    if (input.tracksStock !== undefined) {
      patch.tracksStock = existingItem.type === 'service' ? false : input.tracksStock;
    }

    if (input.trackBatchMode !== undefined) {
      patch.trackBatchMode = input.trackBatchMode;
    }

    return await itemGateway.updateItem(patch);
  };
};
