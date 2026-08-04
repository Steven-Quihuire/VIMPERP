import {
  ForbiddenError,
  hasAuthCapability,
  type AuthCapability,
  type CompanyLifecycle,
} from '../../identity/domain/auth';
import { ItemNotFoundError, type ItemCatalogGateway } from '../domain/item';

type SoftDeleteItemInput = {
  companyId: string;
  localId: string | null;
  actorUserId: string;
  capabilities: AuthCapability[];
  companyStatus: CompanyLifecycle;
  correlationId: string;
  itemId: string;
};

export const createSoftDeleteItemUseCase = ({
  itemGateway,
}: {
  itemGateway: ItemCatalogGateway;
}) => {
  return async (input: SoftDeleteItemInput): Promise<void> => {
    if (input.companyStatus !== 'active') {
      throw new ForbiddenError('Company access unavailable');
    }

    if (!hasAuthCapability(input.capabilities, 'catalog.delete')) {
      throw new ForbiddenError();
    }

    const existingItem = await itemGateway.getItemById({
      companyId: input.companyId,
      localId: input.localId,
      itemId: input.itemId,
      includeDeleted: false,
    });

    if (!existingItem) {
      throw new ItemNotFoundError();
    }

    await itemGateway.softDeleteItem({
      companyId: input.companyId,
      localId: input.localId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      itemId: input.itemId,
    });
  };
};
