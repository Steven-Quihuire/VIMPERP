import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  CreateItemCategoryInput,
  CreateItemInput,
  UpdateItemCategoryInput,
  UpdateItemInput,
} from '../domain/item';
import {
  itemQueryKeys,
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreateItemMutation,
  useItemQuery,
  useItemsQuery,
  useSoftDeleteItemMutation,
  useUpdateCategoryMutation,
  useUpdateItemMutation,
} from './item-queries';

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('item query hooks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses stable query keys for items, item detail, and categories', () => {
    expect(itemQueryKeys.all).toEqual(['items']);
    expect(itemQueryKeys.list()).toEqual(['items']);
    expect(itemQueryKeys.detail('item-7')).toEqual(['item', 'item-7']);
    expect(itemQueryKeys.categories).toEqual(['categories']);
  });

  it('fetches items, item detail, and categories through TanStack Query', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/items')) {
        return Promise.resolve(createJsonResponse({ items: [{ id: 'item-1' }], nextCursor: null }));
      }

      if (url.endsWith('/items/item-1')) {
        return Promise.resolve(createJsonResponse({ id: 'item-1', name: 'Desk lamp' }));
      }

      if (url.endsWith('/item-categories')) {
        return Promise.resolve(createJsonResponse({ categories: [{ id: 'category-1', name: 'Lighting' }] }));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = createWrapper(queryClient);
    const itemsHook = renderHook(() => useItemsQuery(), { wrapper });
    const itemHook = renderHook(() => useItemQuery('item-1'), { wrapper });
    const categoriesHook = renderHook(() => useCategoriesQuery(), { wrapper });

    await waitFor(() => expect(itemsHook.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(itemHook.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(categoriesHook.result.current.isSuccess).toBe(true));

    expect(itemsHook.result.current.data).toEqual({ items: [{ id: 'item-1' }], nextCursor: null });
    expect(itemHook.result.current.data).toEqual({ id: 'item-1', name: 'Desk lamp' });
    expect(categoriesHook.result.current.data).toEqual({ categories: [{ id: 'category-1', name: 'Lighting' }] });
  });

  it('invalidates the expected queries after item and category mutations succeed', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/items') && init?.method === 'POST') {
        return Promise.resolve(createJsonResponse({ itemId: 'item-1' }, 201));
      }

      if (url.endsWith('/items/item-1') && init?.method === 'PATCH') {
        return Promise.resolve(createJsonResponse({ itemId: 'item-1' }));
      }

      if (url.endsWith('/items/item-1') && init?.method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      if (url.endsWith('/item-categories') && init?.method === 'POST') {
        return Promise.resolve(createJsonResponse({ categoryId: 'category-1' }, 201));
      }

      if (url.endsWith('/item-categories/category-1') && init?.method === 'PATCH') {
        return Promise.resolve(createJsonResponse({ categoryId: 'category-1' }));
      }

      throw new Error(`unexpected request: ${url} (${init?.method ?? 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = createWrapper(queryClient);
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

    const createItemHook = renderHook(() => useCreateItemMutation(), { wrapper });
    const updateItemHook = renderHook(() => useUpdateItemMutation(), { wrapper });
    const deleteItemHook = renderHook(() => useSoftDeleteItemMutation(), { wrapper });
    const createCategoryHook = renderHook(() => useCreateCategoryMutation(), { wrapper });
    const updateCategoryHook = renderHook(() => useUpdateCategoryMutation(), { wrapper });

    await expect(createItemHook.result.current.mutateAsync(createItemInput)).resolves.toEqual({
      itemId: 'item-1',
    });
    await expect(
      updateItemHook.result.current.mutateAsync({
        id: 'item-1',
        input: updateItemInput,
      }),
    ).resolves.toEqual({ itemId: 'item-1' });
    await expect(deleteItemHook.result.current.mutateAsync('item-1')).resolves.toBeUndefined();
    await expect(createCategoryHook.result.current.mutateAsync(createCategoryInput)).resolves.toEqual({
      categoryId: 'category-1',
    });
    await expect(
      updateCategoryHook.result.current.mutateAsync({
        id: 'category-1',
        input: updateCategoryInput,
      }),
    ).resolves.toEqual({ categoryId: 'category-1' });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: itemQueryKeys.list() });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: itemQueryKeys.detail('item-1') });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: itemQueryKeys.categories });
  });
});
