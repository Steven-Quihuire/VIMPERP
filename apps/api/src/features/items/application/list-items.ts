import { ForbiddenError, hasAuthCapability, type AuthCapability, type CompanyLifecycle } from '../../identity/domain/auth';
import type { Item, ItemCatalogGateway } from '../domain/item';

type ListItemsInput = {
  companyId: string;
  localId: string | null;
  capabilities: AuthCapability[];
  companyStatus: CompanyLifecycle;
  limit: number;
  cursor?: string;
};

export const createListItemsUseCase = ({
  itemGateway,
}: {
  itemGateway: ItemCatalogGateway;
}) => {
  return async (input: ListItemsInput): Promise<{ items: Item[]; nextCursor: string | null }> => {
    if (input.companyStatus !== 'active') {
      throw new ForbiddenError('Company access unavailable');
    }

    if (!hasAuthCapability(input.capabilities, 'catalog.read')) {
      throw new ForbiddenError();
    }

    return await itemGateway.listItems({
      companyId: input.companyId,
      localId: input.localId,
      limit: input.limit,
      ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
    });
  };
};
