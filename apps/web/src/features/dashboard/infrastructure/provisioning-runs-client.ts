import { getApiBaseUrl } from '../../../shared/lib/http/api-base-url';
import { createHttpClient } from '../../../shared/lib/http/http-client';
import type {
  ProvisioningRunDetail,
  ProvisioningRunListFilters,
  ProvisioningRunsPage,
} from '../domain/provisioning-runs';

const toQueryString = (filters: ProvisioningRunListFilters) => {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.correlationId) {
    params.set('correlationId', filters.correlationId);
  }

  if (typeof filters.limit === 'number') {
    params.set('limit', String(filters.limit));
  }

  if (filters.cursor) {
    params.set('cursor', filters.cursor);
  }

  const queryString = params.toString();

  return queryString.length > 0 ? `?${queryString}` : '';
};

export const createProvisioningRunsClient = (apiBaseUrl = getApiBaseUrl()) => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    listProvisioningRuns: async (
      filters: ProvisioningRunListFilters,
    ): Promise<ProvisioningRunsPage> => {
      const response = await httpClient.get<{
        provisioningRuns: ProvisioningRunsPage['items'];
        nextCursor: string | null;
      }>(`/admin/provisioning-runs${toQueryString(filters)}`);

      return {
        items: response.provisioningRuns,
        nextCursor: response.nextCursor,
      };
    },
    getProvisioningRunDetail: async (runId: string): Promise<ProvisioningRunDetail> =>
      httpClient.get<ProvisioningRunDetail>(`/admin/provisioning-runs/${runId}`),
  };
};
