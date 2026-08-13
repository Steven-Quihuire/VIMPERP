import type { OrgTreeGateway } from '../domain/org-tree';

export const createListOrgTreeUseCase = ({
  gateway,
}: {
  gateway: OrgTreeGateway;
}) => {
  return async (input: { companyId: string; actorUserId: string }) => {
    return await gateway.listAuthorizedOrgTree(input);
  };
};
