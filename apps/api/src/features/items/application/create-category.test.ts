import { describe, expect, it, vi } from 'vitest';

import { createCreateCategoryUseCase } from './create-category';
import {
  CategoryNotFoundError,
  type CategoryGateway,
  type ItemCatalogGateway,
  type ItemCategory,
} from '../domain/item';

const buildCategory = (overrides: Partial<ItemCategory> = {}): ItemCategory => ({
  id: 'category-1',
  companyId: 'company-1',
  parentId: null,
  name: 'Hardware',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const createGateway = (parent: ItemCategory | null = buildCategory()) => {
  const gateway: ItemCatalogGateway & CategoryGateway = {
    createItem: vi.fn(),
    updateItem: vi.fn(),
    softDeleteItem: vi.fn(),
    getItemById: vi.fn(),
    listItems: vi.fn(),
    createCategory: vi.fn().mockResolvedValue({ categoryId: 'category-2' }),
    getCategoryById: vi.fn().mockResolvedValue(parent),
    listCategories: vi.fn(),
    getDescendantIds: vi.fn(),
    updateCategory: vi.fn(),
  };

  return gateway;
};

describe('createCreateCategoryUseCase', () => {
  it('creates a category with a trimmed name and validated parent', async () => {
    const itemGateway = createGateway();
    const createCategory = createCreateCategoryUseCase({ itemGateway });

    const result = await createCategory({
      companyId: 'company-1',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      name: '  Keyboards  ',
      parentId: 'category-1',
    });

    expect(itemGateway.getCategoryById).toHaveBeenCalledWith({
      companyId: 'company-1',
      categoryId: 'category-1',
    });
    expect(itemGateway.createCategory).toHaveBeenCalledWith({
      companyId: 'company-1',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      name: 'Keyboards',
      parentId: 'category-1',
    });
    expect(result).toEqual({ categoryId: 'category-2' });
  });

  it('rejects missing parent categories in the same company', async () => {
    const itemGateway = createGateway(null);
    const createCategory = createCreateCategoryUseCase({ itemGateway });

    await expect(
      createCategory({
        companyId: 'company-1',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
        name: 'Keyboards',
        parentId: 'missing-parent',
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);

    expect(itemGateway.createCategory).not.toHaveBeenCalled();
  });
});
