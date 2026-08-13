import { useQuery } from '@tanstack/react-query';

import { createOrgTreeGateway } from '../infrastructure/org-tree-http-gateway';

export const orgTreeQueryKeys = {
  tree: (companyId: string) => ['org-tree', companyId] as const,
};

export const useOrgTree = (companyId: string | undefined, apiBaseUrl?: string) => {
  const gateway = createOrgTreeGateway(apiBaseUrl);

  return useQuery({
    queryKey: orgTreeQueryKeys.tree(companyId ?? ''),
    queryFn: () => gateway.listOrgTree(companyId as string),
    enabled: Boolean(companyId),
  });
};
