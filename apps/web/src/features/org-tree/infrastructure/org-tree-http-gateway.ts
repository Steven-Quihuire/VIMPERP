import { getApiBaseUrl } from '@/shared/lib/http/api-base-url';
import { createHttpClient } from '@/shared/lib/http/http-client';

import type { OrgTreeGateway, OrgTreeNode } from '../domain/org-tree';

export const createOrgTreeGateway = (
  apiBaseUrl = getApiBaseUrl(),
): OrgTreeGateway => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    listOrgTree: (companyId: string) =>
      httpClient.get<OrgTreeNode[]>(`/companies/${companyId}/org-tree`),
  };
};
