import { describe, expect, it, vi } from 'vitest';

import { createCreateItemUseCase } from './create-item';
import { ForbiddenError } from '../../identity/domain/auth';
import type { CategoryGateway, ItemCatalogGateway } from '../domain/item';

const createGateway = () => {
  const gateway: ItemCatalogGateway & CategoryGateway = {
    createItem: vi.fn().mockResolvedValue({ itemId: 'item-1' }),
    updateItem: vi.fn(),
    softDeleteItem: vi.fn(),
    getItemById: vi.fn(),
    listItems: vi.fn(),
    createCategory: vi.fn(),
    getCategoryById: vi.fn(),
    listCategories: vi.fn(),
    getDescendantIds: vi.fn(),
    updateCategory: vi.fn(),
  };

  return gateway;
};

describe('createCreateItemUseCase', () => {
  it('creates a product with normalized name and default values', async () => {
    const itemGateway = createGateway();
    const createItem = createCreateItemUseCase({ itemGateway });

    const result = await createItem({
      companyId: 'company-1',
      actorUserId: 'user-1',
      capabilities: ['catalog.write'],
      companyStatus: 'active',
      correlationId: 'corr-1',
      name: '  Keyboard  ',
      type: 'product',
      unit: 'unit',
      sku: null,
      categoryId: null,
      unitPrice: 12,
    });

    expect(itemGateway.createItem).toHaveBeenCalledWith({
      companyId: 'company-1',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      name: 'Keyboard',
      type: 'product',
      unit: 'unit',
      sku: null,
      categoryId: null,
      unitPrice: 12,
      tracksStock: false,
      trackBatchMode: 'none',
    });
    expect(result).toEqual({ itemId: 'item-1' });
  });

  it('forces service items to disable stock tracking even when the caller requests it', async () => {
    const itemGateway = createGateway();
    const createItem = createCreateItemUseCase({ itemGateway });

    await createItem({
      companyId: 'company-1',
      actorUserId: 'user-1',
      capabilities: ['catalog.write'],
      companyStatus: 'active',
      correlationId: 'corr-1',
      name: '  Consulting  ',
      type: 'service',
      unit: 'service',
      sku: 'svc-1',
      categoryId: 'category-1',
      unitPrice: 0,
      tracksStock: true,
      trackBatchMode: 'batch',
    });

    expect(itemGateway.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Consulting',
        tracksStock: false,
        trackBatchMode: 'batch',
      }),
    );
  });

  it('rejects negative prices before delegating to the gateway', async () => {
    const itemGateway = createGateway();
    const createItem = createCreateItemUseCase({ itemGateway });

    await expect(
      createItem({
        companyId: 'company-1',
        actorUserId: 'user-1',
        capabilities: ['catalog.write'],
        companyStatus: 'active',
        correlationId: 'corr-1',
        name: 'Keyboard',
        type: 'product',
        unit: 'unit',
        sku: null,
        categoryId: null,
        unitPrice: -1,
      }),
    ).rejects.toThrow('Item unit price must be non-negative');

    expect(itemGateway.createItem).not.toHaveBeenCalled();
  });

  it('rejects blank item names after trimming', async () => {
    const itemGateway = createGateway();
    const createItem = createCreateItemUseCase({ itemGateway });

    await expect(
      createItem({
        companyId: 'company-1',
        actorUserId: 'user-1',
        capabilities: ['catalog.write'],
        companyStatus: 'active',
        correlationId: 'corr-1',
        name: '   ',
        type: 'product',
        unit: 'unit',
        sku: null,
        categoryId: null,
        unitPrice: 0,
      }),
    ).rejects.toThrow('Item name is required');

    expect(itemGateway.createItem).not.toHaveBeenCalled();
  });

  it('rejects writes when the active company is blocked', async () => {
    const itemGateway = createGateway();
    const createItem = createCreateItemUseCase({ itemGateway });

    await expect(
      createItem({
        companyId: 'company-1',
        actorUserId: 'user-1',
        capabilities: ['catalog.write'],
        companyStatus: 'suspended',
        correlationId: 'corr-1',
        name: 'Keyboard',
        type: 'product',
        unit: 'unit',
        sku: null,
        categoryId: null,
        unitPrice: 0,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(itemGateway.createItem).not.toHaveBeenCalled();
  });

  it('rejects writes when the caller lacks catalog write capability', async () => {
    const itemGateway = createGateway();
    const createItem = createCreateItemUseCase({ itemGateway });

    await expect(
      createItem({
        companyId: 'company-1',
        actorUserId: 'user-1',
        capabilities: ['catalog.read'],
        companyStatus: 'active',
        correlationId: 'corr-1',
        name: 'Keyboard',
        type: 'product',
        unit: 'unit',
        sku: null,
        categoryId: null,
        unitPrice: 0,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(itemGateway.createItem).not.toHaveBeenCalled();
  });
});
