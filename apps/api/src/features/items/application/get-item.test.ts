import { describe, expect, it, vi } from 'vitest';

import { createGetItemUseCase } from './get-item';
import { type CategoryGateway, type Item, type ItemCatalogGateway } from '../domain/item';

const buildItem = (): Item => ({
  id: 'item-1',
  companyId: 'company-1',
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
});

const createGateway = (item: Item | null = buildItem()) => {
  const gateway: ItemCatalogGateway & CategoryGateway = {
    createItem: vi.fn(),
    updateItem: vi.fn(),
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

describe('createGetItemUseCase', () => {
  it('returns the item when it belongs to the active company', async () => {
    const item = buildItem();
    const itemGateway = createGateway(item);
    const getItem = createGetItemUseCase({ itemGateway });

    await expect(
      getItem({
        companyId: 'company-1',
        capabilities: ['catalog.read'],
        companyStatus: 'active',
        itemId: 'item-1',
      }),
    ).resolves.toEqual(item);

    expect(itemGateway.getItemById).toHaveBeenCalledWith({
      companyId: 'company-1',
      itemId: 'item-1',
      includeDeleted: false,
    });
  });

  it('returns null for foreign-company or missing items', async () => {
    const itemGateway = createGateway(null);
    const getItem = createGetItemUseCase({ itemGateway });

    await expect(
      getItem({
        companyId: 'company-a',
        capabilities: ['catalog.read'],
        companyStatus: 'active',
        itemId: 'item-b',
      }),
    ).resolves.toBeNull();
  });

  it('allows callers to opt into includeDeleted lookups', async () => {
    const itemGateway = createGateway();
    const getItem = createGetItemUseCase({ itemGateway });

    await getItem({
      companyId: 'company-1',
      capabilities: ['catalog.read'],
      companyStatus: 'active',
      itemId: 'item-1',
      includeDeleted: true,
    });

    expect(itemGateway.getItemById).toHaveBeenCalledWith({
      companyId: 'company-1',
      itemId: 'item-1',
      includeDeleted: true,
    });
  });
});
