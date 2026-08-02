import { ForbiddenError, hasAuthCapability, type AuthCapability, type CompanyLifecycle } from '../../identity/domain/auth';
import type { Item, ItemCatalogGateway } from '../domain/item';

type GetItemInput = {
  companyId: string;
  capabilities: AuthCapability[];
  companyStatus: CompanyLifecycle;
  itemId: string;
  includeDeleted?: boolean;
};

export const createGetItemUseCase = ({
  itemGateway,
}: {
  itemGateway: ItemCatalogGateway;
}) => {
  return async (input: GetItemInput): Promise<Item | null> => {
    if (input.companyStatus !== 'active') {
      throw new ForbiddenError('Company access unavailable');
    }

    if (!hasAuthCapability(input.capabilities, 'catalog.read')) {
      throw new ForbiddenError();
    }

    return await itemGateway.getItemById({
      companyId: input.companyId,
      itemId: input.itemId,
      includeDeleted: input.includeDeleted ?? false,
    });
  };
};
