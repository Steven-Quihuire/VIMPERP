import { getApiBaseUrl } from '../../../shared/lib/http/api-base-url';
import { createHttpClient } from '../../../shared/lib/http/http-client';
import type {
  ApplicationErrorDetail,
  ApplicationErrorListFilters,
  ApplicationErrorsPage,
} from '../domain/application-errors';

const toQueryString = (filters: ApplicationErrorListFilters) => {
  const params = new URLSearchParams();

  if (filters.fingerprint) {
    params.set('fingerprint', filters.fingerprint);
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

export const createApplicationErrorsClient = (apiBaseUrl = getApiBaseUrl()) => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    listApplicationErrors: async (
      filters: ApplicationErrorListFilters,
    ): Promise<ApplicationErrorsPage> => {
      const response = await httpClient.get<{
        applicationErrors: ApplicationErrorsPage['items'];
        nextCursor: string | null;
      }>(`/admin/application-errors${toQueryString(filters)}`);

      return {
        items: response.applicationErrors,
        nextCursor: response.nextCursor,
      };
    },
    getApplicationErrorDetail: async (
      errorId: string,
    ): Promise<ApplicationErrorDetail> =>
      httpClient.get<ApplicationErrorDetail>(`/admin/application-errors/${errorId}`),
  };
};
