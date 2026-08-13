import type { ScopeResolver } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
import type { OrgTreeGateway } from '../domain/org-tree';

export const createDrizzleOrgTreeGateway = ({
  scopeResolver,
}: {
  scopeResolver: ScopeResolver;
}): OrgTreeGateway => ({
  listAuthorizedOrgTree: async ({ companyId, actorUserId }) => {
    return await scopeResolver.listAuthorizedDescendants(companyId, actorUserId);
  },
});
