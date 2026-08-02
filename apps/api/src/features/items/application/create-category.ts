import { ForbiddenError, hasAuthCapability, type AuthCapability, type CompanyLifecycle } from '../../identity/domain/auth';
import {
  CategoryNotFoundError,
  type CategoryGateway,
} from '../domain/item';

type CreateCategoryInput = {
  companyId: string;
  actorUserId: string;
  capabilities: AuthCapability[];
  companyStatus: CompanyLifecycle;
  correlationId: string;
  name: string;
  parentId: string | null;
};

export const createCreateCategoryUseCase = ({
  itemGateway,
}: {
  itemGateway: CategoryGateway;
}) => {
  return async (input: CreateCategoryInput): Promise<{ categoryId: string }> => {
    if (input.companyStatus !== 'active') {
      throw new ForbiddenError('Company access unavailable');
    }

    if (!hasAuthCapability(input.capabilities, 'catalog.write')) {
      throw new ForbiddenError();
    }

    const name = input.name.trim();

    if (name.length === 0) {
      throw new Error('Category name is required');
    }

    if (input.parentId !== null) {
      const parent = await itemGateway.getCategoryById({
        companyId: input.companyId,
        categoryId: input.parentId,
      });

      if (!parent) {
        throw new CategoryNotFoundError();
      }
    }

    return await itemGateway.createCategory({
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      name,
      parentId: input.parentId,
    });
  };
};
