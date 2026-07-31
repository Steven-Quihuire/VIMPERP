import type { CategoryGateway, ItemCategory } from '../domain/item';

type ListCategoriesInput = {
  companyId: string;
};

export const createListCategoriesUseCase = ({
  itemGateway,
}: {
  itemGateway: CategoryGateway;
}) => {
  return async (input: ListCategoriesInput): Promise<{ categories: ItemCategory[] }> => {
    const categories = await itemGateway.listCategories({ companyId: input.companyId });

    return { categories };
  };
};
