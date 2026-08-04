import { describe, expect, it, vi } from 'vitest';

import { createUpdateItemUseCase } from './update-item';
import {
  ItemNotFoundError,
  ItemTypeImmutableError,
  type CategoryGateway,
  type Item,
  type ItemCatalogGateway,
} from '../domain/item';

const buildItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  companyId: 'company-1',
  localId: null,
  categoryId: null,
  sku: 'sku-1',
  name: 'Keyboard',
  type: 'product',
  unit: 'unit',
  unitPrice: 10,
  tracksStock: true,
  trackBatchMode: 'none',
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const createGateway = (item: Item | null = buildItem()) => {
  const gateway: ItemCatalogGateway & CategoryGateway = {
    createItem: vi.fn(),
    updateItem: vi.fn().mockResolvedValue({ itemId: 'item-1' }),
    softDeleteItem: vi.fn(),
    getItemById: vi.fn().mockResolvedValue(item),
    listItems: vi.fn(),
    createCategory: vi.fn(),
    getCategoryById: vi.fn(),
    listCategories: vi.fn(),
    getDescendantIds: vi.fn(),
    updateCategory: vi.fn(),
  };

  return gateway;
};

describe('createUpdateItemUseCase', () => {
  it('updates mutable fields when the item exists in the same company', async () => {
    const itemGateway = createGateway();
    const updateItem = createUpdateItemUseCase({ itemGateway });

    const result = await updateItem({
      companyId: 'company-1',
      localId: null,
      actorUserId: 'user-1',
      capabilities: ['catalog.write'],
      companyStatus: 'active',
      correlationId: 'corr-1',
      itemId: 'item-1',
      name: '  Keyboard Pro  ',
      unit: 'box',
      sku: null,
      categoryId: 'category-2',
      unitPrice: 22,
      tracksStock: false,
      trackBatchMode: 'batch',
    });

    expect(itemGateway.getItemById).toHaveBeenCalledWith({
      companyId: 'company-1',
      localId: null,
      itemId: 'item-1',
      includeDeleted: false,
    });
    expect(itemGateway.updateItem).toHaveBeenCalledWith({
      companyId: 'company-1',
      localId: null,
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      itemId: 'item-1',
      name: 'Keyboard Pro',
      unit: 'box',
      sku: null,
      categoryId: 'category-2',
      unitPrice: 22,
      tracksStock: false,
      trackBatchMode: 'batch',
    });
    expect(result).toEqual({ itemId: 'item-1' });
  });

  it('allows the current type to be provided when it matches, but does not forward it to the gateway', async () => {
    const itemGateway = createGateway();
    const updateItem = createUpdateItemUseCase({ itemGateway });

    await updateItem({
      companyId: 'company-1',
      localId: null,
      actorUserId: 'user-1',
      capabilities: ['catalog.write'],
      companyStatus: 'active',
      correlationId: 'corr-1',
      itemId: 'item-1',
      type: 'product',
      unitPrice: 15,
    });

    expect(itemGateway.updateItem).toHaveBeenCalledWith({
      companyId: 'company-1',
      localId: null,
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      itemId: 'item-1',
      unitPrice: 15,
    });
  });

  it('rejects attempts to change the immutable item type', async () => {
    const itemGateway = createGateway();
    const updateItem = createUpdateItemUseCase({ itemGateway });

    await expect(
      updateItem({
        companyId: 'company-1',
        localId: null,
        actorUserId: 'user-1',
        capabilities: ['catalog.write'],
        companyStatus: 'active',
        correlationId: 'corr-1',
        itemId: 'item-1',
        type: 'service',
      }),
    ).rejects.toBeInstanceOf(ItemTypeImmutableError);

    expect(itemGateway.updateItem).not.toHaveBeenCalled();
  });

  it('rejects updates when the item does not exist in the active company', async () => {
    const itemGateway = createGateway(null);
    const updateItem = createUpdateItemUseCase({ itemGateway });

    await expect(
      updateItem({
        companyId: 'company-1',
        localId: null,
        actorUserId: 'user-1',
        capabilities: ['catalog.write'],
        companyStatus: 'active',
        correlationId: 'corr-1',
        itemId: 'item-404',
      }),
    ).rejects.toBeInstanceOf(ItemNotFoundError);

    expect(itemGateway.updateItem).not.toHaveBeenCalled();
  });

  it('treats soft-deleted items as not found by reading with includeDeleted=false', async () => {
    const itemGateway = createGateway(null);
    const updateItem = createUpdateItemUseCase({ itemGateway });

    await expect(
      updateItem({
        companyId: 'company-1',
        localId: null,
        actorUserId: 'user-1',
        capabilities: ['catalog.write'],
        companyStatus: 'active',
        correlationId: 'corr-1',
        itemId: 'item-1',
        name: 'Updated',
      }),
    ).rejects.toBeInstanceOf(ItemNotFoundError);

    expect(itemGateway.getItemById).toHaveBeenCalledWith({
      companyId: 'company-1',
      localId: null,
      itemId: 'item-1',
      includeDeleted: false,
    });
  });
});
