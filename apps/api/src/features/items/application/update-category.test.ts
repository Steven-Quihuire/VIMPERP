import { describe, expect, it, vi } from 'vitest';

import { createUpdateCategoryUseCase } from './update-category';
import {
  CategoryCycleError,
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

const createGateway = ({
  current = buildCategory(),
  parent = buildCategory({ id: 'parent-1', name: 'Parent' }),
  descendants = [],
}: {
  current?: ItemCategory | null;
  parent?: ItemCategory | null;
  descendants?: string[];
} = {}) => {
  const gateway: ItemCatalogGateway & CategoryGateway = {
    createItem: vi.fn(),
    updateItem: vi.fn(),
    softDeleteItem: vi.fn(),
    getItemById: vi.fn(),
    listItems: vi.fn(),
    createCategory: vi.fn(),
    getCategoryById: vi.fn().mockImplementation(({ categoryId }: { categoryId: string }) => {
      if (current?.id === categoryId) {
        return Promise.resolve(current);
      }

      if (parent?.id === categoryId) {
        return Promise.resolve(parent);
      }

      return Promise.resolve(null);
    }),
    listCategories: vi.fn(),
    getDescendantIds: vi.fn().mockResolvedValue(descendants),
    updateCategory: vi.fn().mockResolvedValue({ categoryId: 'category-1' }),
  };

  return gateway;
};

describe('createUpdateCategoryUseCase', () => {
  it('rejects self-parenting cycles', async () => {
    const itemGateway = createGateway();
    const updateCategory = createUpdateCategoryUseCase({ itemGateway });

    await expect(
      updateCategory({
        companyId: 'company-1',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
        categoryId: 'category-1',
        parentId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(CategoryCycleError);

    expect(itemGateway.updateCategory).not.toHaveBeenCalled();
  });

  it('rejects assigning a descendant as the new parent', async () => {
    const itemGateway = createGateway({
      parent: buildCategory({ id: 'child-1', parentId: 'category-1', name: 'Child' }),
      descendants: ['child-1'],
    });
    const updateCategory = createUpdateCategoryUseCase({ itemGateway });

    await expect(
      updateCategory({
        companyId: 'company-1',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
        categoryId: 'category-1',
        parentId: 'child-1',
      }),
    ).rejects.toBeInstanceOf(CategoryCycleError);

    expect(itemGateway.getDescendantIds).toHaveBeenCalledWith({
      companyId: 'company-1',
      categoryId: 'category-1',
    });
  });

  it('updates the category when the new parent is valid', async () => {
    const itemGateway = createGateway();
    const updateCategory = createUpdateCategoryUseCase({ itemGateway });

    const result = await updateCategory({
      companyId: 'company-1',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      categoryId: 'category-1',
      name: '  Hardware Updated  ',
      parentId: 'parent-1',
    });

    expect(itemGateway.updateCategory).toHaveBeenCalledWith({
      companyId: 'company-1',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      categoryId: 'category-1',
      name: 'Hardware Updated',
      parentId: 'parent-1',
    });
    expect(result).toEqual({ categoryId: 'category-1' });
  });

  it('rejects updates when the category or requested parent does not exist', async () => {
    const missingCurrentGateway = createGateway({ current: null });
    const updateMissingCurrent = createUpdateCategoryUseCase({ itemGateway: missingCurrentGateway });

    await expect(
      updateMissingCurrent({
        companyId: 'company-1',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
        categoryId: 'missing-category',
        parentId: 'parent-1',
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);

    const missingParentGateway = createGateway({ parent: null });
    const updateMissingParent = createUpdateCategoryUseCase({ itemGateway: missingParentGateway });

    await expect(
      updateMissingParent({
        companyId: 'company-1',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
        categoryId: 'category-1',
        parentId: 'missing-parent',
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });
});
