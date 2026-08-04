import { ForbiddenError, hasAuthCapability, type AuthCapability, type CompanyLifecycle } from '../../identity/domain/auth';
import type { CategoryGateway, ItemCategory } from '../domain/item';

type ListCategoriesInput = {
  companyId: string;
  localId: string | null;
  capabilities: AuthCapability[];
  companyStatus: CompanyLifecycle;
};

export const createListCategoriesUseCase = ({
  itemGateway,
}: {
  itemGateway: CategoryGateway;
}) => {
  return async (input: ListCategoriesInput): Promise<{ categories: ItemCategory[] }> => {
    if (input.companyStatus !== 'active') {
      throw new ForbiddenError('Company access unavailable');
    }

    if (!hasAuthCapability(input.capabilities, 'catalog.read')) {
      throw new ForbiddenError();
    }

    const categories = await itemGateway.listCategories({
      companyId: input.companyId,
      localId: input.localId,
    });

    return { categories };
  };
};
