import type { ResolvedScopeNode } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';

export type OrgTreeNode = ResolvedScopeNode;

export type OrgTreeGateway = {
  listAuthorizedOrgTree: (input: {
    companyId: string;
    actorUserId: string;
  }) => Promise<OrgTreeNode[]>;
};
