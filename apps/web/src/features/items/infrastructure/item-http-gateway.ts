import { getApiBaseUrl } from '@/shared/lib/http/api-base-url';
import { createHttpClient } from '@/shared/lib/http/http-client';

import type {
  CreateItemCategoryInput,
  CreateItemInput,
  Item,
  ItemCategory,
  ItemGateway,
  UpdateItemCategoryInput,
  UpdateItemInput,
} from '../domain/item';

const buildItemsQuery = (limit?: number, cursor?: string) => {
  const params = new URLSearchParams();

  if (typeof limit === 'number') {
    params.set('limit', String(limit));
  }

  if (cursor) {
    params.set('cursor', cursor);
  }

  const queryString = params.toString();

  return queryString.length > 0 ? `/items?${queryString}` : '/items';
};

export const createItemHttpGateway = (apiBaseUrl = getApiBaseUrl()): ItemGateway => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    fetchItems: async (limit?: number, cursor?: string) =>
      httpClient.get<{ items: Item[]; nextCursor: string | null }>(buildItemsQuery(limit, cursor)),
    fetchItem: async (id: string) => httpClient.get<Item | null>(`/items/${id}`),
    createItem: async (input: CreateItemInput) => {
      const response = await httpClient.post<CreateItemInput>('/items', input);
      return (await response.json()) as { itemId: string };
    },
    updateItem: async (id: string, input: UpdateItemInput) => {
      const response = await httpClient.patch<UpdateItemInput>(`/items/${id}`, input);
      return (await response.json()) as { itemId: string };
    },
    softDeleteItem: async (id: string) => {
      await httpClient.delete(`/items/${id}`);
    },
    fetchCategories: async () =>
      httpClient.get<{ categories: ItemCategory[] }>('/item-categories'),
    createCategory: async (input: CreateItemCategoryInput) => {
      const response = await httpClient.post<CreateItemCategoryInput>('/item-categories', input);
      return (await response.json()) as { categoryId: string };
    },
    updateCategory: async (id: string, input: UpdateItemCategoryInput) => {
      const response = await httpClient.patch<UpdateItemCategoryInput>(`/item-categories/${id}`, input);
      return (await response.json()) as { categoryId: string };
    },
  };
};
