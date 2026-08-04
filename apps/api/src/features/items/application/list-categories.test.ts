import { describe, expect, it, vi } from 'vitest';

import { createListCategoriesUseCase } from './list-categories';
import { type CategoryGateway, type ItemCatalogGateway, type ItemCategory } from '../domain/item';

const buildCategory = (id: string, companyId = 'company-1'): ItemCategory => ({
  id,
  companyId,
  localId: null,
  parentId: null,
  name: `Category ${id}`,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
});

const createGateway = () => {
  const gateway: ItemCatalogGateway & CategoryGateway = {
    createItem: vi.fn(),
    updateItem: vi.fn(),
    softDeleteItem: vi.fn(),
    getItemById: vi.fn(),
    listItems: vi.fn(),
    createCategory: vi.fn(),
    getCategoryById: vi.fn(),
    listCategories: vi.fn().mockResolvedValue([
      buildCategory('category-1'),
      buildCategory('category-2'),
    ]),
    getDescendantIds: vi.fn(),
    updateCategory: vi.fn(),
  };

  return gateway;
};

describe('createListCategoriesUseCase', () => {
  it('delegates category listing to the gateway and returns tenant categories', async () => {
    const itemGateway = createGateway();
    const listCategories = createListCategoriesUseCase({ itemGateway });

    const result = await listCategories({
      companyId: 'company-1',
      localId: null,
      capabilities: ['catalog.read'],
      companyStatus: 'active',
    });

    expect(itemGateway.listCategories).toHaveBeenCalledWith({
      companyId: 'company-1',
      localId: null,
    });
    expect(result).toEqual({
      categories: [buildCategory('category-1'), buildCategory('category-2')],
    });
  });
});
