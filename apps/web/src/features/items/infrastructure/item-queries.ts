import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateItemCategoryInput,
  CreateItemInput,
  UpdateItemCategoryInput,
  UpdateItemInput,
} from '../domain/item';
import { createItemHttpGateway } from './item-http-gateway';

const gateway = createItemHttpGateway();

export const itemQueryKeys = {
  all: ['items'] as const,
  list: () => ['items'] as const,
  detail: (id: string) => ['item', id] as const,
  categories: ['categories'] as const,
};

export const useItemsQuery = () =>
  useQuery({
    queryKey: itemQueryKeys.list(),
    queryFn: () => gateway.fetchItems(),
  });

export const useItemQuery = (id: string) =>
  useQuery({
    queryKey: itemQueryKeys.detail(id),
    queryFn: () => gateway.fetchItem(id),
    enabled: id.length > 0,
  });

export const useCategoriesQuery = () =>
  useQuery({
    queryKey: itemQueryKeys.categories,
    queryFn: () => gateway.fetchCategories(),
  });

export const useCreateItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateItemInput) => gateway.createItem(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemQueryKeys.list() });
    },
  });
};

export const useUpdateItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateItemInput }) => gateway.updateItem(id, input),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: itemQueryKeys.list() }),
        queryClient.invalidateQueries({ queryKey: itemQueryKeys.detail(variables.id) }),
      ]);
    },
  });
};

export const useSoftDeleteItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => gateway.softDeleteItem(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemQueryKeys.list() });
    },
  });
};

export const useCreateCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateItemCategoryInput) => gateway.createCategory(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemQueryKeys.categories });
    },
  });
};

export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateItemCategoryInput }) =>
      gateway.updateCategory(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemQueryKeys.categories });
    },
  });
};
