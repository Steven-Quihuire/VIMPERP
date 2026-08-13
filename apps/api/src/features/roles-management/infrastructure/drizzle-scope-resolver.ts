import type { AppDb } from '../../../shared/infrastructure/db/client';
import { createDrizzleScopeResolver } from '../../../shared/infrastructure/scope-hierarchy/drizzle-scope-resolver';
import { ScopeNodeNotFoundError } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
import { ScopeRefDanglingError, type ScopeHierarchyGateway } from '../domain/assignments';

export const createDrizzleScopeHierarchyGateway = (
  db: AppDb,
): ScopeHierarchyGateway => {
  const resolver = createDrizzleScopeResolver(db);

  return {
    assertScopeRefBelongsToCompany: async (companyId, scope) => {
      try {
        await resolver.getLineage(companyId, scope);
      } catch (error) {
        if (error instanceof ScopeNodeNotFoundError) {
          throw new ScopeRefDanglingError();
        }

        throw error;
      }
    },
    getScopeLineage: async (companyId, scope) => {
      try {
        return await resolver.getLineage(companyId, scope);
      } catch (error) {
        if (error instanceof ScopeNodeNotFoundError) {
          throw new ScopeRefDanglingError();
        }

        throw error;
      }
    },
  };
};
