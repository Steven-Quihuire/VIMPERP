import { ForbiddenError, hasAuthCapability, type AuthCapability, type CompanyLifecycle } from '../../identity/domain/auth';
import {
  CategoryCycleError,
  CategoryNotFoundError,
  type CategoryGateway,
} from '../domain/item';

type UpdateCategoryInput = {
  companyId: string;
  localId: string | null;
  actorUserId: string;
  capabilities: AuthCapability[];
  companyStatus: CompanyLifecycle;
  correlationId: string;
  categoryId: string;
  name?: string;
  parentId?: string | null;
};

export const createUpdateCategoryUseCase = ({
  itemGateway,
}: {
  itemGateway: CategoryGateway;
}) => {
  return async (input: UpdateCategoryInput): Promise<{ categoryId: string }> => {
    if (input.companyStatus !== 'active') {
      throw new ForbiddenError('Company access unavailable');
    }

    if (!hasAuthCapability(input.capabilities, 'catalog.write')) {
      throw new ForbiddenError();
    }

    const currentCategory = await itemGateway.getCategoryById({
      companyId: input.companyId,
      localId: input.localId,
      categoryId: input.categoryId,
    });

    if (!currentCategory) {
      throw new CategoryNotFoundError();
    }

    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new Error('Category name is required');
    }

    if (input.parentId !== undefined) {
      if (input.parentId === input.categoryId) {
        throw new CategoryCycleError();
      }

      if (input.parentId !== null) {
        const parent = await itemGateway.getCategoryById({
          companyId: input.companyId,
          localId: input.localId,
          categoryId: input.parentId,
        });

        if (!parent) {
          throw new CategoryNotFoundError();
        }

        const descendantIds = await itemGateway.getDescendantIds({
          companyId: input.companyId,
          localId: input.localId,
          categoryId: input.categoryId,
        });

        if (descendantIds.includes(input.parentId)) {
          throw new CategoryCycleError();
        }
      }
    }

    return await itemGateway.updateCategory({
      companyId: input.companyId,
      localId: input.localId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      categoryId: input.categoryId,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    });
  };
};
