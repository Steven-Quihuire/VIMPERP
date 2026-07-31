import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  CreateItemCategoryInput,
  CreateItemInput,
  UpdateItemCategoryInput,
  UpdateItemInput,
} from '../domain/item';
import { createItemHttpGateway } from './item-http-gateway';

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('createItemHttpGateway', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests item and category endpoints with the expected methods and payloads', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url === 'https://api.vimcore.test/items?limit=20&cursor=cursor-1') {
        expect(init?.method).toBeUndefined();
        return Promise.resolve(createJsonResponse({ items: [], nextCursor: null }));
      }

      if (url === 'https://api.vimcore.test/items/item-1' && init?.method === undefined) {
        expect(init?.method).toBeUndefined();
        return Promise.resolve(
          createJsonResponse({
            id: 'item-1',
            companyId: 'company-1',
            categoryId: null,
            sku: 'SKU-1',
            name: 'Desk lamp',
            type: 'product',
            unit: 'unit',
            unitPrice: 12,
            tracksStock: true,
            trackBatchMode: 'none',
            deletedAt: null,
            createdAt: '2026-07-31T10:00:00.000Z',
            updatedAt: '2026-07-31T10:00:00.000Z',
          }),
        );
      }

      if (url === 'https://api.vimcore.test/items' && init?.method === 'POST') {
        expect(init?.body).toBe(
          JSON.stringify({
            categoryId: null,
            sku: 'SKU-1',
            name: 'Desk lamp',
            type: 'product',
            unit: 'unit',
            unitPrice: 12,
            tracksStock: true,
            trackBatchMode: 'none',
          }),
        );
        return Promise.resolve(createJsonResponse({ itemId: 'item-1' }, 201));
      }

      if (url === 'https://api.vimcore.test/items/item-1' && init?.method === 'PATCH') {
        expect(init?.body).toBe(JSON.stringify({ name: 'Desk lamp updated' }));
        return Promise.resolve(createJsonResponse({ itemId: 'item-1' }));
      }

      if (url === 'https://api.vimcore.test/items/item-1' && init?.method === 'DELETE') {
        expect(init?.body).toBeUndefined();
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      if (url === 'https://api.vimcore.test/item-categories' && init?.method === undefined) {
        expect(init?.method).toBeUndefined();
        return Promise.resolve(createJsonResponse({ categories: [] }));
      }

      if (url === 'https://api.vimcore.test/item-categories' && init?.method === 'POST') {
        expect(init?.body).toBe(JSON.stringify({ name: 'Lighting', parentId: null }));
        return Promise.resolve(createJsonResponse({ categoryId: 'category-1' }, 201));
      }

      if (url === 'https://api.vimcore.test/item-categories/category-1' && init?.method === 'PATCH') {
        expect(init?.body).toBe(JSON.stringify({ name: 'Decor' }));
        return Promise.resolve(createJsonResponse({ categoryId: 'category-1' }));
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const gateway = createItemHttpGateway('https://api.vimcore.test');
    const createItemInput: CreateItemInput = {
      categoryId: null,
      sku: 'SKU-1',
      name: 'Desk lamp',
      type: 'product',
      unit: 'unit',
      unitPrice: 12,
      tracksStock: true,
      trackBatchMode: 'none',
    };
    const updateItemInput: UpdateItemInput = { name: 'Desk lamp updated' };
    const createCategoryInput: CreateItemCategoryInput = { name: 'Lighting', parentId: null };
    const updateCategoryInput: UpdateItemCategoryInput = { name: 'Decor' };

    await expect(gateway.fetchItems(20, 'cursor-1')).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    await expect(gateway.fetchItem('item-1')).resolves.toMatchObject({ id: 'item-1' });
    await expect(gateway.createItem(createItemInput)).resolves.toEqual({
      itemId: 'item-1',
    });
    await expect(gateway.updateItem('item-1', updateItemInput)).resolves.toEqual({ itemId: 'item-1' });
    await expect(gateway.softDeleteItem('item-1')).resolves.toBeUndefined();
    await expect(gateway.fetchCategories()).resolves.toEqual({ categories: [] });
    await expect(gateway.createCategory(createCategoryInput)).resolves.toEqual({ categoryId: 'category-1' });
    await expect(gateway.updateCategory('category-1', updateCategoryInput)).resolves.toEqual({
      categoryId: 'category-1',
    });
  });
});
