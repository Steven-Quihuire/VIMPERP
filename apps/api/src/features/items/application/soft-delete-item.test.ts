import { describe, expect, it, vi } from 'vitest';

import { createSoftDeleteItemUseCase } from './soft-delete-item';
import { ForbiddenError } from '../../identity/domain/auth';
import {
  ItemNotFoundError,
  type CategoryGateway,
  type Item,
  type ItemCatalogGateway,
} from '../domain/item';

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
    softDeleteItem: vi.fn().mockResolvedValue(undefined),
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

describe('createSoftDeleteItemUseCase', () => {
  it('allows company owners to soft-delete active items', async () => {
    const itemGateway = createGateway();
    const softDeleteItem = createSoftDeleteItemUseCase({ itemGateway });

    await expect(
      softDeleteItem({
        companyId: 'company-1',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
        itemId: 'item-1',
        role: 'company-owner',
      }),
    ).resolves.toBeUndefined();

    expect(itemGateway.getItemById).toHaveBeenCalledWith({
      companyId: 'company-1',
      itemId: 'item-1',
      includeDeleted: false,
    });
    expect(itemGateway.softDeleteItem).toHaveBeenCalledWith({
      companyId: 'company-1',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      itemId: 'item-1',
    });
  });

  it('rejects company-user deletion attempts in the use case as defense in depth', async () => {
    const itemGateway = createGateway();
    const softDeleteItem = createSoftDeleteItemUseCase({ itemGateway });

    await expect(
      softDeleteItem({
        companyId: 'company-1',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
        itemId: 'item-1',
        role: 'company-user',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(itemGateway.getItemById).not.toHaveBeenCalled();
    expect(itemGateway.softDeleteItem).not.toHaveBeenCalled();
  });

  it('rejects soft delete when the item is not found', async () => {
    const itemGateway = createGateway(null);
    const softDeleteItem = createSoftDeleteItemUseCase({ itemGateway });

    await expect(
      softDeleteItem({
        companyId: 'company-1',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
        itemId: 'item-404',
        role: 'company-owner',
      }),
    ).rejects.toBeInstanceOf(ItemNotFoundError);

    expect(itemGateway.softDeleteItem).not.toHaveBeenCalled();
  });

  it('treats already soft-deleted items as not found by reading with includeDeleted=false', async () => {
    const itemGateway = createGateway(null);
    const softDeleteItem = createSoftDeleteItemUseCase({ itemGateway });

    await expect(
      softDeleteItem({
        companyId: 'company-1',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
        itemId: 'item-1',
        role: 'company-owner',
      }),
    ).rejects.toBeInstanceOf(ItemNotFoundError);

    expect(itemGateway.getItemById).toHaveBeenCalledWith({
      companyId: 'company-1',
      itemId: 'item-1',
      includeDeleted: false,
    });
  });
});
