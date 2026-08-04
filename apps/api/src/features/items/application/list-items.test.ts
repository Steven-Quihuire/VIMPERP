import { describe, expect, it, vi } from 'vitest';

import { createListItemsUseCase } from './list-items';
import { type CategoryGateway, type Item, type ItemCatalogGateway } from '../domain/item';

const buildItem = (id: string): Item => ({
  id,
  companyId: 'company-1',
  localId: null,
  categoryId: null,
  sku: `${id}-sku`,
  name: `Item ${id}`,
  type: 'product',
  unit: 'unit',
  unitPrice: 10,
  tracksStock: true,
  trackBatchMode: 'none',
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

const createGateway = () => {
  const gateway: ItemCatalogGateway & CategoryGateway = {
    createItem: vi.fn(),
    updateItem: vi.fn(),
    softDeleteItem: vi.fn(),
    getItemById: vi.fn(),
    listItems: vi.fn().mockResolvedValue({
      items: [buildItem('item-1'), buildItem('item-2')],
      nextCursor: 'cursor-2',
    }),
    createCategory: vi.fn(),
    getCategoryById: vi.fn(),
    listCategories: vi.fn(),
    getDescendantIds: vi.fn(),
    updateCategory: vi.fn(),
  };

  return gateway;
};

describe('createListItemsUseCase', () => {
  it('delegates item listing to the gateway and returns its pagination payload', async () => {
    const itemGateway = createGateway();
    const listItems = createListItemsUseCase({ itemGateway });

    const result = await listItems({
      companyId: 'company-1',
      localId: null,
      capabilities: ['catalog.read'],
      companyStatus: 'active',
      limit: 25,
      cursor: 'cursor-1',
    });

    expect(itemGateway.listItems).toHaveBeenCalledWith({
      companyId: 'company-1',
      localId: null,
      limit: 25,
      cursor: 'cursor-1',
    });
    expect(result).toEqual({
      items: [buildItem('item-1'), buildItem('item-2')],
      nextCursor: 'cursor-2',
    });
  });

  it('supports the initial page when no cursor is provided', async () => {
    const itemGateway = createGateway();
    const listItems = createListItemsUseCase({ itemGateway });

    await listItems({
      companyId: 'company-1',
      localId: null,
      capabilities: ['catalog.read'],
      companyStatus: 'active',
      limit: 10,
    });

    expect(itemGateway.listItems).toHaveBeenCalledWith({
      companyId: 'company-1',
      localId: null,
      limit: 10,
      cursor: undefined,
    });
  });
});
